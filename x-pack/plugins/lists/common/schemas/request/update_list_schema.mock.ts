/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DESCRIPTION, LIST_ID, META, NAME, _VERSION } from '../../constants.mock';

import { UpdateListSchema } from './update_list_schema';

export const getUpdateListSchemaMock = (): UpdateListSchema => ({
  _version: _VERSION,
  description: DESCRIPTION,
  id: LIST_ID,
  meta: META,
  name: NAME,
});

/**
 * Useful for end to end tests and other mechanisms which want to fill in the values
 * after doing a get of the structure.
 */
export const getUpdateMinimalListSchemaMock = (): UpdateListSchema => ({
  description: DESCRIPTION,
  id: LIST_ID,
  name: NAME,
});
