/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type { SearchQuery } from '@kbn/content-management-plugin/common';

export class DummyStorage implements ContentStorage {
  async get(ctx: StorageContext, id: string) {
    return { item: {} };
  }

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See ${this.constructor.name} class.`);
  }

  async create(ctx: StorageContext, data: object, options: object) {
    return { item: {} };
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
}
