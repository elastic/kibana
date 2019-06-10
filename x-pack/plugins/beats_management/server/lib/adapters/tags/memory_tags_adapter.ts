/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatTag } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';
import { CMTagsAdapter } from './adapter_types';

export class MemoryTagsAdapter implements CMTagsAdapter {
  private tagsDB: BeatTag[] = [];

  constructor(tagsDB: BeatTag[]) {
    this.tagsDB = tagsDB;
  }

  public async getAll(user: FrameworkUser) {
    return this.tagsDB;
  }
  public async delete(user: FrameworkUser, tagIds: string[]) {
    this.tagsDB = this.tagsDB.filter(tag => !tagIds.includes(tag.id));

    return true;
  }
  public async getTagsWithIds(user: FrameworkUser, tagIds: string[]) {
    return this.tagsDB.filter(tag => tagIds.includes(tag.id));
  }

  public async upsertTag(user: FrameworkUser, tag: BeatTag) {
    const existingTagIndex = this.tagsDB.findIndex(t => t.id === tag.id);
    if (existingTagIndex !== -1) {
      this.tagsDB[existingTagIndex] = tag;
    } else {
      this.tagsDB.push(tag);
    }
    return tag.id;
  }

  public async getWithoutConfigTypes(
    user: FrameworkUser,
    blockTypes: string[]
  ): Promise<BeatTag[]> {
    return this.tagsDB.filter(tag => tag.hasConfigurationBlocksTypes.includes(blockTypes[0]));
  }

  public setDB(tagsDB: BeatTag[]) {
    this.tagsDB = tagsDB;
  }
}
