/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Chance from 'chance'; // eslint-disable-line
import { ConfigurationBlock } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';
import { ConfigurationBlockAdapter } from './adapter_types';

const chance = new Chance();

export class MemoryConfigurationBlockAdapter implements ConfigurationBlockAdapter {
  private db: ConfigurationBlock[] = [];

  constructor(db: ConfigurationBlock[]) {
    this.db = db.map(config => {
      if (config.id === undefined) {
        config.id = chance.word();
      }
      return config as ConfigurationBlock & { id: string };
    });
  }

  public async getByIds(user: FrameworkUser, ids: string[]) {
    return this.db.filter(block => ids.includes(block.id));
  }
  public async delete(user: FrameworkUser, blockIds: string[]) {
    this.db = this.db.filter(block => !blockIds.includes(block.id));
  }
  public async getForTags(user: FrameworkUser, tagIds: string[]) {
    return this.db.filter(block => tagIds.includes(block.id));
  }

  public async create(user: FrameworkUser, blocks: ConfigurationBlock[]) {
    return blocks.map(block => {
      const existingIndex = this.db.findIndex(t => t.id === block.id);
      if (existingIndex !== -1) {
        this.db[existingIndex] = block;
      } else {
        this.db.push(block);
      }
      return block.id;
    });
  }

  public setDB(db: ConfigurationBlock[]) {
    this.db = db.map(block => {
      if (block.id === undefined) {
        block.id = chance.word();
      }
      return block;
    });
  }
}
