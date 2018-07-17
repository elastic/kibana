/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BeatTag } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';

export interface CMTagsAdapter {
  getTagsWithIds(user: FrameworkUser, tagIds: string[]): any;
  upsertTag(user: FrameworkUser, tag: BeatTag): Promise<{}>;
}
