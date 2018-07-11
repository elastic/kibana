/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatTag } from '../../../../common/domain_types';
import { FrameworkRequest } from '../framework/adapter_types';
import { CMTagsAdapter } from './adapter_types';

export class MemoryTagsAdapter implements CMTagsAdapter {
  private tagsDB: BeatTag[] = [];

  constructor(tagsDB: BeatTag[]) {
    this.tagsDB = tagsDB;
  }

  public async getTagsWithIds(req: FrameworkRequest, tagIds: string[]) {
    return this.tagsDB.filter(tag => tagIds.includes(tag.id));
  }

  public async upsertTag(req: FrameworkRequest, tag: BeatTag) {
    const existingTagIndex = this.tagsDB.findIndex(t => t.id === tag.id);
    if (existingTagIndex !== -1) {
      this.tagsDB[existingTagIndex] = tag;
    } else {
      this.tagsDB.push(tag);
    }
    return tag;
  }
}
