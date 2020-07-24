/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DATE_NOW,
  DESCRIPTION,
  ENDPOINT_TYPE,
  IMMUTABLE,
  META,
  TIE_BREAKER,
  USER,
  VERSION,
  _VERSION,
} from '../../constants.mock';
import { ENDPOINT_LIST_ID } from '../..';

import { ExceptionListSchema } from './exception_list_schema';
export const getExceptionListSchemaMock = (): ExceptionListSchema => ({
  _tags: ['endpoint', 'process', 'malware', 'os:linux'],
  _version: _VERSION,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  id: '1',
  immutable: IMMUTABLE,
  list_id: ENDPOINT_LIST_ID,
  meta: META,
  name: 'Sample Endpoint Exception List',
  namespace_type: 'agnostic',
  tags: ['user added string for a tag', 'malware'],
  tie_breaker_id: TIE_BREAKER,
  type: ENDPOINT_TYPE,
  updated_at: DATE_NOW,
  updated_by: 'user_name',
  version: VERSION,
});
