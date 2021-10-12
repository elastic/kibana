/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { SecuritySubPlugins } from '../../app/types';
import { createInitialState } from './reducer';
import { mockSourcererState } from '../mock';
import { useSourcererDataView } from '../containers/sourcerer';
import { useDeepEqualSelector } from '../hooks/use_selector';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('../hooks/use_selector');
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
      defaultDataView: mockSourcererState.defaultDataView,
      enableExperimental: parseExperimentalConfigValue([]),
      kibanaDataViews: [mockSourcererState.defaultDataView],
      signalIndexName: 'siem-signals-default',
    };
    const initState = createInitialState(mockPluginState, defaultState);
    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => cb(initState));
    });
    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockClear();
    });

    test('indicesExist should be TRUE if configIndexPatterns is NOT empty', async () => {
      const { result } = renderHook(() => useSourcererDataView());
      expect(result.current.indicesExist).toEqual(true);
    });

    test('indicesExist should be FALSE if configIndexPatterns is empty', () => {
      const state = createInitialState(mockPluginState, {
        ...defaultState,
        defaultDataView: {
          ...defaultState.defaultDataView,
          id: '',
          title: '',
          patternList: [],
        },
      });
      (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => cb(state));
      const { result } = renderHook(() => useSourcererDataView());
      expect(result.current.indicesExist).toEqual(false);
    });
  });
});
