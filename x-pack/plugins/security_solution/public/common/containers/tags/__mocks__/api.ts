/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MOCK_TAG_ID = 'securityTagId';

export const DEFAULT_TAGS_RESPONSE = [
  {
    id: MOCK_TAG_ID,
    name: 'test tag',
    description: 'test tag description',
    color: '#2c7b82',
  },
];

export const getTagsByName = jest
  .fn()
  .mockImplementation(() => Promise.resolve(DEFAULT_TAGS_RESPONSE));
export const createTag = jest
  .fn()
  .mockImplementation(() => Promise.resolve(DEFAULT_TAGS_RESPONSE[0]));
