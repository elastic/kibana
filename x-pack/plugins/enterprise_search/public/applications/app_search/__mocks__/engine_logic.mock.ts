/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateEncodedPath } from '../utils/encode_path_params';

export const mockEngineValues = {
  engineName: 'some-engine',
  engine: {},
};

export const mockGenerateEnginePath = jest.fn((path, pathParams = {}) =>
  generateEncodedPath(path, { engineName: mockEngineValues.engineName, ...pathParams })
);

jest.mock('../components/engine', () => ({
  EngineLogic: { values: mockEngineValues },
  generateEnginePath: mockGenerateEnginePath,
}));
