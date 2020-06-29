/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { List, ListArray } from './lists';

export const getListMock = (): List => ({
  id: 'some_uuid',
  namespace_type: 'single',
});

export const getListAgnosticMock = (): List => ({
  id: 'some_uuid',
  namespace_type: 'agnostic',
});

export const getListArrayMock = (): ListArray => [getListMock(), getListAgnosticMock()];
