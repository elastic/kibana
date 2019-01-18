/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigurationBlock } from '../../../../common/domain_types';
import { FrontendConfigBlocksAdapter } from './adapter_types';

export class MemoryConfigBlocksAdapter implements FrontendConfigBlocksAdapter {
  constructor(private db: ConfigurationBlock[]) {}

  public async upsert(blocks: ConfigurationBlock[]) {
    this.db = this.db.concat(blocks);
    return blocks.map(() => ({
      success: true,
      blockID: Math.random()
        .toString(36)
        .substring(7),
    }));
  }
  public async getForTags(
    tagIds: string[]
  ): Promise<{
    error?: string;
    blocks: ConfigurationBlock[];
    page: number;
    total: number;
  }> {
    return {
      blocks: this.db.filter(block => tagIds.includes(block.tag)),
      page: 0,
      total: this.db.filter(block => tagIds.includes(block.tag)).length,
    };
  }
  public async delete(id: string): Promise<boolean> {
    this.db = this.db.reduce((newDB: ConfigurationBlock[], block) => {
      if (block.id !== id) {
        newDB.push(block);
      }
      return newDB;
    }, []);
    return !!this.db.find(block => block.id === id);
  }
}
