/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BeatTag } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';

export interface CMTagsAdapter {
  getAll(user: FrameworkUser, ESQuery?: any): Promise<BeatTag[]>;
  delete(user: FrameworkUser, tagIds: string[]): Promise<boolean>;
  getTagsWithIds(user: FrameworkUser, tagIds: string[]): Promise<BeatTag[]>;
  upsertTag(user: FrameworkUser, tag: BeatTag): Promise<string>;
  getWithoutConfigTypes(user: FrameworkUser, blockTypes: string[]): Promise<BeatTag[]>;
}
