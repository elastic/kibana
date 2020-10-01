/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/types';

export interface Tag {
  id: string;
  title: string;
  description: string;
  color: string;
}

export interface TagAttributes {
  title: string;
  description: string;
  color: string;
}

export interface ITagsClient {
  create(attributes: TagAttributes): Promise<Tag>;
  get(id: string): Promise<Tag>;
  getAll(): Promise<Tag[]>;
  delete(id: string): Promise<void>;
  // TODO: add update
}

export type TagSavedObject = SavedObject<TagAttributes>;

export type TagWithRelations = Tag;
