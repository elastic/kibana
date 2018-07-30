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
    // TODO need endpoint update
    this.REST.get('');
    return [];
  }

  public async getAll(): Promise<BeatTag[]> {
    // TODO need endpoint update

    return [];
  }

  public async upsertTag(tag: BeatTag): Promise<BeatTag | null> {
    // TODO need endpoint update

    return null;
  }
}
