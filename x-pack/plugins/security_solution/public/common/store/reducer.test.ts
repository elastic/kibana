/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { SecuritySubPlugins } from '../../app/types';
import { createInitialState } from './reducer';
import { DEFAULT_INDEX_PATTERN, DEFAULT_DATA_VIEW_ID } from '../../../common/constants';

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
    const defaultState = {
      defaultDataView: {
        id: DEFAULT_DATA_VIEW_ID,
        title: DEFAULT_INDEX_PATTERN.join(','),
        patternList: DEFAULT_INDEX_PATTERN,
      },
      enableExperimental: parseExperimentalConfigValue([]),
      kibanaDataViews: [
        {
          id: DEFAULT_DATA_VIEW_ID,
          title: DEFAULT_INDEX_PATTERN.join(','),
          patternList: DEFAULT_INDEX_PATTERN,
        },
      ],
      signalIndexName: 'siem-signals-default',
    };

    test('indicesExist should be TRUE if configIndexPatterns is NOT empty', () => {
      const initState = createInitialState(mockPluginState, defaultState);

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(true);
    });

    test('indicesExist should be FALSE if configIndexPatterns is empty', () => {
      const initState = createInitialState(mockPluginState, {
        ...defaultState,
        defaultDataView: { id: '', title: '', patternList: [] },
      });

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(false);
    });
  });
});
