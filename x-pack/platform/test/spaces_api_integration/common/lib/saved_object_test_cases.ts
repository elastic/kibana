/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MULTI_NAMESPACE_SAVED_OBJECT_TEST_CASES = Object.freeze({
  DEFAULT_ONLY: Object.freeze({
    id: 'default_only',
    existingNamespaces: ['default'],
  }),
  SPACE_1_ONLY: Object.freeze({
    id: 'space_1_only',
    existingNamespaces: ['space_1'],
  }),
  SPACE_2_ONLY: Object.freeze({
    id: 'space_2_only',
    existingNamespaces: ['space_2'],
  }),
  DEFAULT_AND_SPACE_1: Object.freeze({
    id: 'default_and_space_1',
    existingNamespaces: ['default', 'space_1'],
  }),
  DEFAULT_AND_SPACE_2: Object.freeze({
    id: 'default_and_space_2',
    existingNamespaces: ['default', 'space_2'],
  }),
  SPACE_1_AND_SPACE_2: Object.freeze({
    id: 'space_1_and_space_2',
    existingNamespaces: ['space_1', 'space_2'],
  }),
  EACH_SPACE: Object.freeze({
    id: 'each_space',
    existingNamespaces: ['default', 'space_1', 'space_2'], // each individual space
  }),
  ALL_SPACES: Object.freeze({
    id: 'all_spaces',
    existingNamespaces: ['*'], // all current and future spaces
  }),
  ALIAS_DELETE_INCLUSIVE: Object.freeze({
    id: 'alias_delete_inclusive',
    existingNamespaces: ['default', 'space_1', 'space_2'], // each individual space
  }),
  ALIAS_DELETE_EXCLUSIVE: Object.freeze({
    id: 'alias_delete_exclusive',
    existingNamespaces: ['*'], // all current and future spaces
  }),
  DOES_NOT_EXIST: Object.freeze({
    id: 'does_not_exist',
    existingNamespaces: [] as string[],
  }),
});
