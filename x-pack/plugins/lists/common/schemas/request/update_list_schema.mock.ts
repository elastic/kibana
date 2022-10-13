/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { DESCRIPTION, LIST_ID, META, NAME, _VERSION } from '../../constants.mock';

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
