/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';

import { getSourceDefaults, useSourceManager, UseSourceManager } from '.';
import { mockSourceGroup, mockSourceGroups, mockPatterns, mockSource } from './mocks';
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
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourceGroupId: 'default',
          kibanaIndexPatterns: [],
          isIndexPatternsLoading: true,
          getManageSourceGroupById: result.current.getManageSourceGroupById,
          initializeSourceGroup: result.current.initializeSourceGroup,
          setActiveSourceGroupId: result.current.setActiveSourceGroupId,
          updateSourceGroupIndices: result.current.updateSourceGroupIndices,
        });
      });
    });
    it('initializes loading default source group', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourceGroupId: 'default',
          kibanaIndexPatterns: mockPatterns,
          isIndexPatternsLoading: false,
          getManageSourceGroupById: result.current.getManageSourceGroupById,
          initializeSourceGroup: result.current.initializeSourceGroup,
          setActiveSourceGroupId: result.current.setActiveSourceGroupId,
          updateSourceGroupIndices: result.current.updateSourceGroupIndices,
        });
      });
    });
    it('initialize completes with formatted source group data', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current).toEqual({
          activeSourceGroupId: testId,
          kibanaIndexPatterns: mockPatterns,
          isIndexPatternsLoading: false,
          getManageSourceGroupById: result.current.getManageSourceGroupById,
          initializeSourceGroup: result.current.initializeSourceGroup,
          setActiveSourceGroupId: result.current.setActiveSourceGroupId,
          updateSourceGroupIndices: result.current.updateSourceGroupIndices,
        });
      });
    });
  });
  describe('Methods', () => {
    it('getManageSourceGroupById: initialized source group returns defaults', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        const initializedSourceGroup = result.current.getManageSourceGroupById(testId);
        expect(initializedSourceGroup).toEqual(mockSourceGroup(testId));
      });
    });
    it('getManageSourceGroupById: uninitialized source group returns defaults', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        const uninitializedSourceGroup = result.current.getManageSourceGroupById(uninitializedId);
        expect(uninitializedSourceGroup).toEqual(getSourceDefaults(uninitializedId, mockPatterns));
      });
    });
    it('initializeSourceGroup: initializes source group', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        result.current.initializeSourceGroup(
          uninitializedId,
          mockSourceGroups[uninitializedId],
          true
        );
        await waitForNextUpdate();
        const initializedSourceGroup = result.current.getManageSourceGroupById(uninitializedId);
        expect(initializedSourceGroup.selectedPatterns).toEqual(mockSourceGroups[uninitializedId]);
      });
    });
    it('setActiveSourceGroupId: active source group id gets set only if it gets initialized first', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        expect(result.current.activeSourceGroupId).toEqual(testId);
        result.current.setActiveSourceGroupId(uninitializedId);
        expect(result.current.activeSourceGroupId).toEqual(testId);
        result.current.initializeSourceGroup(uninitializedId);
        result.current.setActiveSourceGroupId(uninitializedId);
        expect(result.current.activeSourceGroupId).toEqual(uninitializedId);
      });
    });
    it('updateSourceGroupIndices: updates source group indices', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook<string, UseSourceManager>(
          () => useSourceManager(),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        let sourceGroup = result.current.getManageSourceGroupById(testId);
        expect(sourceGroup.selectedPatterns).toEqual(mockSourceGroups[testId]);
        expect(sourceGroup.scopePatterns).toEqual(mockSourceGroups[testId]);
        result.current.updateSourceGroupIndices(testId, ['endgame-*', 'filebeat-*']);
        await waitForNextUpdate();
        sourceGroup = result.current.getManageSourceGroupById(testId);
        expect(sourceGroup.scopePatterns).toEqual(mockSourceGroups[testId]);
        expect(sourceGroup.selectedPatterns).toEqual(['endgame-*', 'filebeat-*']);
      });
    });
  });
});
