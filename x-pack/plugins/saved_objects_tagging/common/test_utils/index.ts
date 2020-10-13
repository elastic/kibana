/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Tag, TagAttributes } from '../types';

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
