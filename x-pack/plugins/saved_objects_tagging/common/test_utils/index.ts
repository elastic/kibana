/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference } from '@kbn/core/types';
import { Tag, TagAttributes } from '../types';
import { TagsCapabilities } from '../capabilities';
import { AssignableObject } from '../assignments';

export const createReference = (type: string, id: string): SavedObjectReference => ({
  type,
  id,
  name: `${type}-ref-${id}`,
});

export const createTagReference = (id: string) => createReference('tag', id);

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

export const createAssignableObject = (
  parts: Partial<AssignableObject> = {}
): AssignableObject => ({
  type: 'type',
  id: 'id',
  title: 'title',
  tags: [],
  ...parts,
});
