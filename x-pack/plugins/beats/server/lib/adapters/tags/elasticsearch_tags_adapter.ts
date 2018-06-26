/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import {
  BackendFrameworkAdapter,
  BeatTag,
  CMTagsAdapter,
  FrameworkRequest,
} from '../../lib';

export class ElasticsearchTagsAdapter implements CMTagsAdapter {
  private framework: BackendFrameworkAdapter;

  constructor(framework: BackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getTagsWithIds(req: FrameworkRequest, tagIds: string[]) {
    const ids = tagIds.map(tag => `tag:${tag}`);

    // TODO abstract to kibana adapter as the more generic getDocs
    const params = {
      _source: false,
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };
    const response = await this.framework.callWithRequest(req, 'mget', params);
    return get(response, 'docs', []);
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
    const response = await this.framework.callWithRequest(req, 'index', params);

    // TODO this is not something that works for TS... change this return type
    return get(response, 'result');
  }
}
