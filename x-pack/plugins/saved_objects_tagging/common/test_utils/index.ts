/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectReference } from 'src/core/types';
import { Tag, TagAttributes } from '../types';
import { TagsCapabilities } from '../capabilities';

export const createTagReference = (id: string): SavedObjectReference => ({
  type: 'tag',
  id,
  name: `tag-ref-${id}`,
});

export const createSavedObject = (parts: Partial<SavedObject>): SavedObject => ({
  type: 'tag',
  id: 'id',
  references: [],
  attributes: {},
  ...parts,
});

export const createTag = (parts: Partial<Tag> = {}): Tag => ({
  id: 'tag-id',
  name: 'some-tag',
  description: 'Some tag',
  color: '#FF00CC',
  ...parts,
});

export const createTagAttributes = (parts: Partial<TagAttributes> = {}): TagAttributes => ({
  name: 'some-tag',
  description: 'Some tag',
  color: '#FF00CC',
  ...parts,
});

export const createTagCapabilities = (parts: Partial<TagsCapabilities> = {}): TagsCapabilities => ({
  view: true,
  create: true,
  edit: true,
  delete: true,
  assign: true,
  viewConnections: true,
  ...parts,
});
