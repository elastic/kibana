/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';

import { BeatTag } from '../../../../common/domain_types';
import { DatabaseAdapter } from '../database/adapter_types';
import { FrameworkRequest } from '../framework/adapter_types';
import { CMTagsAdapter } from './adapter_types';

export class ElasticsearchTagsAdapter implements CMTagsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getTagsWithIds(req: FrameworkRequest, tagIds: string[]) {
    const ids = tagIds.map(tag => `tag:${tag}`);

    // TODO abstract to kibana adapter as the more generic getDocs
    const params = {
      _sourceInclude: ['tag.configuration_blocks'],
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };
    const response = await this.database.mget(req, params);

    return get(response, 'docs', [])
      .filter((b: any) => b.found)
      .map((b: any) => ({
        ...b._source.tag,
        id: b._id.replace('tag:', ''),
      }));
  }

  public async upsertTag(req: FrameworkRequest, tag: BeatTag) {
    const body = {
      tag,
      type: 'tag',
    };

    const params = {
      body,
      id: `tag:${tag.id}`,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    };
    const response = await this.database.index(req, params);

    // TODO this is not something that works for TS... change this return type
    return get(response, 'result');
  }
}
