/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { getSourceDefaults, useSourceManager, UseSourceManager } from '.';
import { mockSource } from './mocks';
import { SOURCE_GROUPS, sourceGroups } from './constants';

const isStringifiedComparisonEqual = (a: {}, b: {}): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      data: {
        indexPatterns: {
          getTitles: jest.fn().mockImplementation(() => Promise.resolve(['winlogbeat-*'])),
        },
      },
    },
  }),
}));
jest.mock('../../utils/apollo_context', () => ({
  useApolloClient: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation(() => Promise.resolve(mockSource)),
  }),
}));

describe('Index Fields & Browser Fields', () => {
  const testId = SOURCE_GROUPS.default;
  const sourceDefaults = getSourceDefaults(testId, []);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  it('initilizes an undefined timeline', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(() =>
        useSourceManager()
      );
      await waitForNextUpdate();
      expect(result.current.isIndexPatternsLoading).toBeTruthy();
      // const uninitializedSourceGroup = result.current.getManageSourceGroupById(testId);
      // expect(isStringifiedComparisonEqual(uninitializedSourceGroup, sourceDefaults)).toBeTruthy();
    });
  });
});
