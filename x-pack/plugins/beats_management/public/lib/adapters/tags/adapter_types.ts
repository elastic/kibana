/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BeatTag } from '../../../../common/domain_types';

export interface CMTagsAdapter {
  getTagsWithIds(tagIds: string[]): Promise<BeatTag[]>;
  delete(tagIds: string[]): Promise<boolean>;
  getAll(): Promise<BeatTag[]>;
  upsertTag(tag: BeatTag): Promise<BeatTag | null>;
}
