/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';

import { getSourceDefaults, useSourcerer, UseSourcerer } from '.';
import { mockSourcererScope, mockSourcererScopes, mockPatterns, mockSource } from './mocks';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { RouteSpyState } from '../../utils/route/types';
import { SecurityPageName } from '../../../../common/constants';
import { createStore, State } from '../../store';
import {
  apolloClientObservable,
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../mock';
const mockSourceDefaults = mockSource(SourcererScopeName.default);

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => [mockRouteSpy],
}));
jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      data: {
        indexPatterns: {
          getTitles: jest.fn().mockImplementation(() => Promise.resolve(mockPatterns)),
        },
      },
    },
  }),
}));
jest.mock('../../utils/apollo_context', () => ({
  useApolloClient: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation(() => Promise.resolve(mockSourceDefaults)),
  }),
}));

describe('Sourcerer Hooks', () => {
  const testId = SourcererScopeName.default;
  const uninitializedId = SourcererScopeName.host;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });
  describe('Initialization', () => {
    it('initializes loading default index patterns', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourcererScopeId: 'default',
          kibanaIndexPatterns: [],
          isIndexPatternsLoading: true,
          getSourcererScopeById: result.current.getSourcererScopeById,
          initializeSourcererScope: result.current.initializeSourcererScope,
          setActiveSourcererScopeId: result.current.setActiveSourcererScopeId,
          updateSourcererScopeIndices: result.current.updateSourcererScopeIndices,
        });
      });
    });
    it('initializes loading default source group', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourcererScopeId: 'default',
          kibanaIndexPatterns: mockPatterns,
          isIndexPatternsLoading: false,
          getSourcererScopeById: result.current.getSourcererScopeById,
          initializeSourcererScope: result.current.initializeSourcererScope,
          setActiveSourcererScopeId: result.current.setActiveSourcererScopeId,
          updateSourcererScopeIndices: result.current.updateSourcererScopeIndices,
        });
      });
    });
    it('initialize completes with formatted source group data', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourcererScopeId: testId,
          kibanaIndexPatterns: mockPatterns,
          isIndexPatternsLoading: false,
          getSourcererScopeById: result.current.getSourcererScopeById,
          initializeSourcererScope: result.current.initializeSourcererScope,
          setActiveSourcererScopeId: result.current.setActiveSourcererScopeId,
          updateSourcererScopeIndices: result.current.updateSourcererScopeIndices,
        });
      });
    });
  });
  describe('Methods', () => {
    it('getSourcererScopeById: initialized source group returns defaults', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        const initializedSourcererScope = result.current.getSourcererScopeById(testId);
        expect(initializedSourcererScope).toEqual(mockSourcererScope(testId));
      });
    });
    it('getSourcererScopeById: uninitialized source group returns defaults', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        const uninitializedSourcererScope = result.current.getSourcererScopeById(uninitializedId);
        expect(uninitializedSourcererScope).toEqual(
          getSourceDefaults(uninitializedId, mockPatterns)
        );
      });
    });
    it('initializeSourcererScope: initializes source group', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        result.current.initializeSourcererScope(
          uninitializedId,
          mockSourcererScopes[uninitializedId],
          true
        );
        await waitForNextUpdate();
        const initializedSourcererScope = result.current.getSourcererScopeById(uninitializedId);
        expect(initializedSourcererScope.selectedPatterns).toEqual(
          mockSourcererScopes[uninitializedId]
        );
      });
    });
    it('setActiveSourcererScopeId: active source group id gets set only if it gets initialized first', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.activeSourcererScopeId).toEqual(testId);
        result.current.setActiveSourcererScopeId(uninitializedId);
        expect(result.current.activeSourcererScopeId).toEqual(testId);
        result.current.initializeSourcererScope(uninitializedId);
        result.current.setActiveSourcererScopeId(uninitializedId);
        expect(result.current.activeSourcererScopeId).toEqual(uninitializedId);
      });
    });
    it('updateSourcererScopeIndices: updates source group indices', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
          () => useSourcerer(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        let sourceGroup = result.current.getSourcererScopeById(testId);
        expect(sourceGroup.selectedPatterns).toEqual(mockSourcererScopes[testId]);
        expect(sourceGroup.scopePatterns).toEqual(mockSourcererScopes[testId]);
        result.current.updateSourcererScopeIndices(testId, ['endgame-*', 'filebeat-*']);
        await waitForNextUpdate();
        sourceGroup = result.current.getSourcererScopeById(testId);
        expect(sourceGroup.scopePatterns).toEqual(mockSourcererScopes[testId]);
        expect(sourceGroup.selectedPatterns).toEqual(['endgame-*', 'filebeat-*']);
      });
    });
  });
});
