/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BeatTag } from '../../common/domain_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { CMTagsAdapter } from './adapters/tags/adapter_types';

export class CMTagsDomain {
  constructor(private readonly adapter: CMTagsAdapter) {}

  public async getAll(user: FrameworkUser, ESQuery?: any): Promise<BeatTag[]> {
    const tags = await this.adapter.getAll(user, ESQuery);
    return tags;
  }

  public async getWithIds(user: FrameworkUser, tagIds: string[]): Promise<BeatTag[]> {
    const tags = await this.adapter.getTagsWithIds(user, tagIds);
    return tags;
  }

  public async delete(user: FrameworkUser, tagIds: string[]) {
    return await this.adapter.delete(user, tagIds);
  }

  public async upsertTag(user: FrameworkUser, tag: BeatTag): Promise<string> {
    const tagId = await this.adapter.upsertTag(user, tag);

    return tagId;
  }
}
