/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// actual mocks
export const expandLiteralStrings = jest.fn();
export const XJsonMode = jest.fn();
export const useRequest = jest.fn(() => ({
  isLoading: false,
  error: null,
  data: undefined,
}));
export const getSavedSearch = jest.fn();

// just passing through the reimports
export { getMlSharedImports, ES_CLIENT_TOTAL_HITS_RELATION } from '../../../ml/public';
