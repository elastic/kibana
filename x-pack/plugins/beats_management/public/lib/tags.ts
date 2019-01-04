/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UNIQUENESS_ENFORCING_TYPES } from '../../common/constants/configuration_blocks';
import { BeatTag, CMBeat } from '../../common/domain_types';
import { CMTagsAdapter } from './adapters/tags/adapter_types';

export class TagsLib {
  constructor(private readonly adapter: CMTagsAdapter) {}

  public async getTagsWithIds(tagIds: string[]): Promise<BeatTag[]> {
    return await this.adapter.getTagsWithIds([...new Set(tagIds)]);
  }
  public async delete(tagIds: string[]): Promise<boolean> {
    return await this.adapter.delete([...new Set(tagIds)]);
  }

  // FIXME: This needs to be paginated https://github.com/elastic/kibana/issues/26022
  public async getAll(ESQuery?: string): Promise<BeatTag[]> {
    return await this.adapter.getAll(ESQuery);
  }
  public async upsertTag(tag: BeatTag): Promise<BeatTag | null> {
    tag.id = tag.id.replace(' ', '-');
    return await this.adapter.upsertTag(tag);
  }

  public async getTagsForBeats(beats: CMBeat[]): Promise<BeatTag[]> {
    const existingTags = await this.adapter.getTagsWithIds([
      ...new Set(beats.reduce((ids: string[], beat) => ids.concat([beat.id]), [])),
    ]);

    const configTypesToBeIgnored = existingTags.reduce(
      (uniquenessEnforcingConfigTypes: string[], tag) => {
        return uniquenessEnforcingConfigTypes.concat(
          tag.hasConfigurationBlocksTypes.filter(type => UNIQUENESS_ENFORCING_TYPES.includes(type))
        );
      },
      []
    );

    return await this.adapter.tagsExcept(existingTags, configTypesToBeIgnored);
  }
}
