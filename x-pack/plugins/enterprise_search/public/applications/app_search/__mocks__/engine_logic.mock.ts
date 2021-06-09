/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EngineDetails } from '../components/engine/types';
import { ENGINES_TITLE } from '../components/engines';
import { generateEncodedPath } from '../utils/encode_path_params';

export const mockEngineValues = {
  engineName: 'some-engine',
  engine: {} as EngineDetails,
  searchKey: 'search-abc123',
};

export const mockEngineActions = {
  initializeEngine: jest.fn(),
};

export const mockGenerateEnginePath = jest.fn((path, pathParams = {}) =>
  generateEncodedPath(path, { engineName: mockEngineValues.engineName, ...pathParams })
);
export const mockGetEngineBreadcrumbs = jest.fn((breadcrumbs = []) => [
  ENGINES_TITLE,
  mockEngineValues.engineName,
  ...breadcrumbs,
]);

jest.mock('../components/engine', () => ({
  EngineLogic: {
    values: mockEngineValues,
    actions: mockEngineActions,
  },
  generateEnginePath: mockGenerateEnginePath,
  getEngineBreadcrumbs: mockGetEngineBreadcrumbs,
}));
