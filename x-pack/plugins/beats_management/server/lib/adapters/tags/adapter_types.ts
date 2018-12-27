/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { FrameworkUser } from '../framework/adapter_types';

export const RuntimeTagDoc = t.interface(
  {
    id: t.union([t.undefined, t.string]),
    name: t.string,
    color: t.string,
    last_updated: t.string,
  },
  'StoredBeatTag'
);
export interface StoredBeatTag extends t.TypeOf<typeof RuntimeTagDoc> {}

export interface CMTagsAdapter {
  getAll(user: FrameworkUser, ESQuery?: any): Promise<StoredBeatTag[]>;
  delete(user: FrameworkUser, tagIds: string[]): Promise<boolean>;
  getTagsWithIds(user: FrameworkUser, tagIds: string[]): Promise<StoredBeatTag[]>;
  upsertTag(user: FrameworkUser, tag: StoredBeatTag): Promise<{}>;
}
