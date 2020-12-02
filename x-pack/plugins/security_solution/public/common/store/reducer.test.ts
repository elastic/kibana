/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createInitialState } from './reducer';

jest.mock('../lib/kibana', () => ({
  KibanaServices: {
    get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
  },
}));

describe('createInitialState', () => {
  describe('sourcerer -> default -> indicesExist', () => {
    test('indicesExist should be TRUE if configIndexPatterns is NOT empty', () => {
      const initState = createInitialState(
        {},
        {
          kibanaIndexPatterns: [{ id: '1234567890987654321', title: 'mock-kibana' }],
          configIndexPatterns: ['auditbeat-*', 'filebeat'],
        }
      );

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(true);
    });

    test('indicesExist should be FALSE if configIndexPatterns is empty', () => {
      const initState = createInitialState(
        {},
        {
          kibanaIndexPatterns: [{ id: '1234567890987654321', title: 'mock-kibana' }],
          configIndexPatterns: [],
        }
      );

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(false);
    });
  });
});
