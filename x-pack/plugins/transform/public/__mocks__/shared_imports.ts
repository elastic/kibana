/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const expandLiteralStrings = jest.fn();
export const XJsonMode = jest.fn();
export const useRequest = jest.fn(() => ({
  isLoading: false,
  error: null,
  data: undefined,
}));
export { mlInMemoryTableBasicFactory } from '../../../ml/public/application/components/ml_in_memory_table';
export const SORT_DIRECTION = { ASC: 'asc' };
