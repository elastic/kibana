/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { List, ListArray } from './lists';
import { ENDPOINT_LIST_ID } from '../../../shared_imports';

export const getListMock = (): List => ({
  id: 'some_uuid',
  list_id: 'list_id_single',
  namespace_type: 'single',
  type: 'detection',
});

export const getEndpointListMock = (): List => ({
  id: ENDPOINT_LIST_ID,
  list_id: ENDPOINT_LIST_ID,
  namespace_type: 'agnostic',
  type: 'endpoint',
});

export const getListArrayMock = (): ListArray => [getListMock(), getEndpointListMock()];
