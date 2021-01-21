/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';

export const mockEngineValues = {
  engineName: 'some-engine',
  // Note: using getters allows us to use `this`, which lets tests
  // override engineName and still generate correct engine names
  get generateEnginePath() {
    return jest.fn((path, pathParams = {}) =>
      generatePath(path, { engineName: this.engineName, ...pathParams })
    );
  },
  engine: {},
};

jest.mock('../components/engine', () => ({
  EngineLogic: { values: mockEngineValues },
}));
