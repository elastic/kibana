/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../..//common/experimental_features';
import { SecuritySubPlugins } from '../../app/types';
import { createInitialState } from './reducer';

jest.mock('../lib/kibana', () => ({
  KibanaServices: {
    get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
  },
}));

describe('createInitialState', () => {
  describe('sourcerer -> default -> indicesExist', () => {
    const mockPluginState = {} as Omit<
      SecuritySubPlugins['store']['initialState'],
      'app' | 'dragAndDrop' | 'inputs' | 'sourcerer'
    >;
    test('indicesExist should be TRUE if configIndexPatterns is NOT empty', () => {
      const initState = createInitialState(mockPluginState, {
        kibanaIndexPatterns: [{ id: '1234567890987654321', title: 'mock-kibana' }],
        configIndexPatterns: ['auditbeat-*', 'filebeat'],
        signalIndexName: 'siem-signals-default',
        enableExperimental: parseExperimentalConfigValue([]),
      });

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(true);
    });

    test('indicesExist should be FALSE if configIndexPatterns is empty', () => {
      const initState = createInitialState(mockPluginState, {
        kibanaIndexPatterns: [{ id: '1234567890987654321', title: 'mock-kibana' }],
        configIndexPatterns: [],
        signalIndexName: 'siem-signals-default',
        enableExperimental: parseExperimentalConfigValue([]),
      });

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(false);
    });
  });
});
