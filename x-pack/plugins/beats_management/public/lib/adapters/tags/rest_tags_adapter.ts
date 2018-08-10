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
    const tags = await this.REST.get<BeatTag[]>(`/api/beats/tags/${tagIds.join(',')}`);
    return tags;
  }

  public async getAll(): Promise<BeatTag[]> {
    return await this.REST.get<BeatTag[]>(`/api/beats/tags`);
  }

  public async delete(tagIds: string[]): Promise<boolean> {
    return (await this.REST.delete<{ success: boolean }>(`/api/beats/tags/${tagIds.join(',')}`))
      .success;
  }

  public async upsertTag(tag: BeatTag): Promise<BeatTag | null> {
    const response = await this.REST.put<{ success: boolean }>(`/api/beats/tag/${tag.id}`, {
      color: tag.color,
      configuration_blocks: tag.configuration_blocks,
    });

    return response.success ? tag : null;
  }
}
