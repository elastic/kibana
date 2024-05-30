/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

// Allows the initialization of the langgraph to set a reference to the context ES client.
// When handleValidatePipeline runs later, it will fetch the reference again.
export class ESClient {
  private static client: IScopedClusterClient | null = null;

  public static setClient(client: IScopedClusterClient): void {
    if (!this.client) {
      this.client = client;
    }
  }

  public static getClient(): IScopedClusterClient {
    if (!this.client) {
      throw new Error('Elasticsearch client has not been instantiated.');
    }
    return this.client;
  }
}
