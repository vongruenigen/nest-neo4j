import { Inject, Injectable, OnApplicationShutdown } from "@nestjs/common";
import neo4j, {
  Driver,
  int,
  QueryResult,
  Session,
  Transaction,
} from "neo4j-driver";
import { Neo4jConnection } from "./interfaces/neo4j-connection.interface";
import { NEO4J_DRIVER, NEO4J_OPTIONS } from "./neo4j.constants";

@Injectable()
export class Neo4jService implements OnApplicationShutdown {
  private readonly driver: Driver;
  private readonly connection: Neo4jConnection;

  constructor(
    @Inject(NEO4J_OPTIONS) config: Neo4jConnection,
    @Inject(NEO4J_DRIVER) driver: Driver,
  ) {
    this.driver = driver;
    this.connection = config;
  }

  getDriver(): Driver {
    return this.driver;
  }

  getConfig(): Neo4jConnection {
    return this.connection;
  }

  int(value: number) {
    return int(value);
  }

  beginTransaction(database?: string): Transaction {
    const session = this.getWriteSession(database);

    return session.beginTransaction();
  }

  getReadSession(database?: string): Session {
    return this.driver.session({
      database: database || this.connection.database,
      defaultAccessMode: neo4j.session.READ,
    });
  }

  getWriteSession(database?: string): Session {
    return this.driver.session({
      database: database || this.connection.database,
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  async read(
    cypher: string,
    params?: Record<string, any>,
    databaseOrTransaction?: string | Transaction,
  ): Promise<QueryResult> {
    if (databaseOrTransaction && typeof databaseOrTransaction === "object") {
      return databaseOrTransaction.run(cypher, params);
    }

    const session = this.getReadSession(databaseOrTransaction);
    const res = await session.executeRead((tx) => tx.run(cypher, params));

    await session.close();

    return res;
  }

  async write(
    cypher: string,
    params?: Record<string, any>,
    databaseOrTransaction?: string | Transaction,
  ): Promise<QueryResult> {
    if (databaseOrTransaction && typeof databaseOrTransaction === "object") {
      return databaseOrTransaction.run(cypher, params);
    }

    const session = this.getWriteSession(databaseOrTransaction);
    const res = await session.executeWrite((tx) => tx.run(cypher, params));

    await session.close();

    return res;
  }

  onApplicationShutdown() {
    return this.driver.close();
  }
}
