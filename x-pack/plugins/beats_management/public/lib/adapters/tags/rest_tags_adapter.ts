/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BeatTag } from '../../../../common/domain_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { CMTagsAdapter } from './adapter_types';

export class RestTagsAdapter implements CMTagsAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async getTagsWithIds(tagIds: string[]): Promise<BeatTag[]> {
    return (await this.REST.get<{ tags: BeatTag[] }>(`/api/beats/tags/${tagIds.join(',')}`)).tags;
  }

  public async getAll(): Promise<BeatTag[]> {
    return (await this.REST.get<{ tags: BeatTag[] }>(`/api/beats/tags`)).tags;
  }

  public async upsertTag(tag: BeatTag): Promise<BeatTag | null> {
    return (await this.REST.put<{ tag: BeatTag }>(`/api/beats/tag/{tag}`, {
      configuration_blocks: tag.configuration_blocks,
    })).tag;
  }
}
