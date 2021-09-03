/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { createInitialState } from './reducer';
import { DEFAULT_INDEX_PATTERN, DEFAULT_INDEX_PATTERN_ID } from '../../../common/constants';

jest.mock('../lib/kibana', () => ({
  KibanaServices: {
    get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
  },
}));

describe('createInitialState', () => {
  describe('sourcerer -> default -> indicesExist', () => {
    const defaultState = {
      defaultIndexPattern: {
        id: DEFAULT_INDEX_PATTERN_ID,
        title: DEFAULT_INDEX_PATTERN.join(','),
        patternList: DEFAULT_INDEX_PATTERN,
      },
      enableExperimental: parseExperimentalConfigValue([]),
      kibanaIndexPatterns: [
        {
          id: DEFAULT_INDEX_PATTERN_ID,
          title: DEFAULT_INDEX_PATTERN.join(','),
          patternList: DEFAULT_INDEX_PATTERN,
        },
      ],
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
          defaultIndexPattern: { id: '', title: '', patternList: [] },
        }
      );

      expect(initState.sourcerer?.sourcererScopes.default.indicesExist).toEqual(false);
    });
  });
});
