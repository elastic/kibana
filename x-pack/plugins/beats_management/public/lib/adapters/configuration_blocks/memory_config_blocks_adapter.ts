/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigurationBlock } from '../../../../common/domain_types';
import { ReturnTypeBulkUpsert, ReturnTypeList } from '../../../../common/return_types';
import { FrontendConfigBlocksAdapter } from './adapter_types';

export class MemoryConfigBlocksAdapter implements FrontendConfigBlocksAdapter {
  constructor(private db: ConfigurationBlock[]) {}

  public async upsert(blocks: ConfigurationBlock[]): Promise<ReturnTypeBulkUpsert> {
    this.db = this.db.concat(blocks);
    return {
      success: true,
      results: blocks.map(() => ({
        success: true,
        action: 'created',
      })),
    } as ReturnTypeBulkUpsert;
  }
  public async getForTags(tagIds: string[]): Promise<ReturnTypeList<ConfigurationBlock>> {
    return {
      success: true,
      list: this.db.filter((block) => tagIds.includes(block.tag)),
      page: 0,
      total: this.db.filter((block) => tagIds.includes(block.tag)).length,
    };
  }
  public async delete(id: string): Promise<boolean> {
    this.db = this.db.reduce((newDB: ConfigurationBlock[], block) => {
      if (block.id !== id) {
        newDB.push(block);
      }
      return newDB;
    }, []);
    return !!this.db.find((block) => block.id === id);
  }
}
