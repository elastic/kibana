/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import * as T from '@elastic/elasticsearch-types';
import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ReportingCore } from '..';

export class ReportingStorage implements ContentStorage {
  private client?: ElasticsearchClient;

  constructor(
    private ctx: {
      logger: Logger;
      reportingCore: ReportingCore;
    }
  ) {}

  async get(ctx: StorageContext, id: string) {
    return { item: {} };
  }

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See ${this.constructor.name} class.`);
  }

  async create(ctx: StorageContext, data: T.estypes.IndexRequest, options: object) {
    const client = await this.getClient();
    const res = await client.index(data);

    return { item: res };
  }

  async update(ctx: StorageContext, id: string, data: object, options: object) {
    return { item: {} };
  }

  async delete(ctx: StorageContext, id: string, options?: object) {
    return { success: true };
  }

  async search(ctx: StorageContext, query: SearchQuery, options: object = {}) {
    return { hits: [], pagination: { total: 0 } };
  }

  private async getClient() {
    if (!this.client) {
      ({ asInternalUser: this.client } = await this.ctx.reportingCore.getEsClient());
    }

    return this.client;
  }
}
