/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { createInitialState } from './reducer';
import { mockSourcererState } from '../mock';

jest.mock('../lib/kibana', () => ({
  KibanaServices: {
    get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
  },
}));

describe('createInitialState', () => {
  describe('sourcerer -> default -> indicesExist', () => {
    const defaultState = {
      defaultDataView: mockSourcererState.defaultDataView,
      enableExperimental: parseExperimentalConfigValue([]),
      kibanaDataViews: [mockSourcererState.defaultDataView],
      signalIndexName: 'siem-signals-default',
    };
    test('indicesExist should be TRUE if configIndexPatterns is NOT empty', () => {
      const initState = createInitialState({}, defaultState);

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(true);
    });

    test('indicesExist should be FALSE if configIndexPatterns is empty', () => {
      const initState = createInitialState(
        {},
        {
          ...defaultState,
          defaultDataView: {
            ...defaultState.defaultDataView,
            id: '',
            title: '',
            patternList: [],
          },
        }
      );

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(false);
    });
  });
});
