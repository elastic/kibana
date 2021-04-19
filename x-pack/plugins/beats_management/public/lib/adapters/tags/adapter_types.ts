/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BeatTag, CMBeat } from '../../../../common/domain_types';

export interface CMTagsAdapter {
  getTagsWithIds(tagIds: string[]): Promise<BeatTag[]>;
  delete(tagIds: string[]): Promise<boolean>;
  getAll(ESQuery?: string): Promise<BeatTag[]>;
  upsertTag(tag: BeatTag): Promise<BeatTag | null>;
  getAssignable(beats: CMBeat[]): Promise<BeatTag[]>;
}
