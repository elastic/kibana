/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BeatTag,
  CMBeat,
} from '../../../../../../legacy/plugins/beats_management/common/domain_types';
import { CMTagsAdapter } from './adapter_types';

export class MemoryTagsAdapter implements CMTagsAdapter {
  private tagsDB: BeatTag[] = [];

  constructor(tagsDB: BeatTag[]) {
    this.tagsDB = tagsDB;
  }

  public async getTagsWithIds(tagIds: string[]) {
    return this.tagsDB.filter((tag) => tagIds.includes(tag.id));
  }

  public async delete(tagIds: string[]) {
    this.tagsDB = this.tagsDB.filter((tag) => !tagIds.includes(tag.id));
    return true;
  }

  public async getAll(ESQuery?: string) {
    return this.tagsDB;
  }

  public async upsertTag(tag: BeatTag) {
    const existingTagIndex = this.tagsDB.findIndex((t) => t.id === tag.id);
    if (existingTagIndex !== -1) {
      this.tagsDB[existingTagIndex] = tag;
    } else {
      this.tagsDB.push(tag);
    }
    return tag;
  }

  public async getAssignable(beats: CMBeat[]) {
    return this.tagsDB;
  }
}
