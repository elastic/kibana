/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import yaml from 'js-yaml';
import { BeatTag, ConfigurationBlock } from '../../../common/domain_types';
import { CMTagsAdapter } from '../adapters/tags/adapter_types';
import { ClientSideBeatTag } from '../lib';

export class TagsLib {
  constructor(private readonly adapter: CMTagsAdapter) {}

  public async getTagsWithIds(tagIds: string[]): Promise<BeatTag[]> {
    return await this.adapter.getTagsWithIds(tagIds);
  }
  public async delete(tagIds: string[]): Promise<boolean> {
    return await this.adapter.delete(tagIds);
  }
  public async getAll(): Promise<BeatTag[]> {
    return await this.adapter.getAll();
  }
  public async upsertTag(tag: ClientSideBeatTag): Promise<BeatTag | null> {
    return await this.adapter.upsertTag(this.tagConfigsToYaml([tag])[0]);
  }

  private tagConfigsToYaml(tags: ClientSideBeatTag[]): BeatTag[] {
    return tags.map(tag => {
      const transformedTag: BeatTag = tag as any;
      transformedTag.configuration_blocks = tag.configurations.map(block => {
        const { type, description, ...block_obj } = block;
        return {
          type,
          description,
          block_yml: yaml.safeDump(block_obj),
        } as ConfigurationBlock;
      });
      return transformedTag;
    });
  }
}
