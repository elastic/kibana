/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';

import { useInitSourcerer } from '.';
import { mockPatterns, mockSource } from './mocks';
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
const mockSourceDefaults = mockSource;

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => [mockRouteSpy],
}));
jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        capabilities: {
          siem: {
            crud: true,
          },
        },
      },
      data: {
        indexPatterns: {
          getTitles: jest.fn().mockImplementation(() => Promise.resolve(mockPatterns)),
        },
        search: {
          search: jest.fn().mockImplementation(() => ({
            subscribe: jest.fn().mockImplementation(() => ({
              error: jest.fn(),
              next: jest.fn(),
            })),
          })),
        },
      },
      notifications: {},
    },
  }),
  useUiSetting$: jest.fn().mockImplementation(() => [mockPatterns]),
}));
jest.mock('../../utils/apollo_context', () => ({
  useApolloClient: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation(() => Promise.resolve(mockSourceDefaults)),
  }),
}));

describe('Sourcerer Hooks', () => {
  // const testId = SourcererScopeName.default;
  // const uninitializedId = SourcererScopeName.detections;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  const state: State = {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.default]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
          indexPattern: {
            fields: [],
            title: '',
          },
        },
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          indexPattern: {
            fields: [],
            title: '',
          },
        },
      },
    },
  };
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
    it('initializes loading default and timeline index patterns', async () => {
      await act(async () => {
        const { waitForNextUpdate } = renderHook<string, void>(() => useInitSourcerer(), {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(mockDispatch).toBeCalledTimes(2);
        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: 'default', loading: true },
        });
        expect(mockDispatch.mock.calls[1][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: 'timeline', loading: true },
        });
        // expect(mockDispatch.mock.calls[1][0]).toEqual({
        //   type: 'x-pack/security_solution/local/sourcerer/SET_INDEX_PATTERNS_LIST',
        //   payload: { allIndexPatterns: mockPatterns, kibanaIndexPatterns: [] },
        // });
      });
    });
    // TO DO sourcerer @S
    // it('initializes loading default source group', async () => {
    //   await act(async () => {
    //     const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
    //       () => useInitSourcerer(),
    //       {
    //         wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    //       }
    //     );
    //     await waitForNextUpdate();
    //     await waitForNextUpdate();
    //     expect(result.current).toEqual({
    //       activeSourcererScopeId: 'default',
    //       kibanaIndexPatterns: mockPatterns,
    //       isIndexPatternsLoading: false,
    //       getSourcererScopeById: result.current.getSourcererScopeById,
    //       setActiveSourcererScopeId: result.current.setActiveSourcererScopeId,
    //       updateSourcererScopeIndices: result.current.updateSourcererScopeIndices,
    //     });
    //   });
    // });
    // it('initialize completes with formatted source group data', async () => {
    //   await act(async () => {
    //     const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
    //       () => useInitSourcerer(),
    //       {
    //         wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    //       }
    //     );
    //     await waitForNextUpdate();
    //     await waitForNextUpdate();
    //     await waitForNextUpdate();
    //     expect(result.current).toEqual({
    //       activeSourcererScopeId: testId,
    //       kibanaIndexPatterns: mockPatterns,
    //       isIndexPatternsLoading: false,
    //       getSourcererScopeById: result.current.getSourcererScopeById,
    //       setActiveSourcererScopeId: result.current.setActiveSourcererScopeId,
    //       updateSourcererScopeIndices: result.current.updateSourcererScopeIndices,
    //     });
    //   });
    // });
  });
  // describe('Methods', () => {
  //   it('getSourcererScopeById: initialized source group returns defaults', async () => {
  //     await act(async () => {
  //       const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
  //         () => useInitSourcerer(),
  //         {
  //           wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  //         }
  //       );
  //       await waitForNextUpdate();
  //       await waitForNextUpdate();
  //       await waitForNextUpdate();
  //       const initializedSourcererScope = result.current.getSourcererScopeById(testId);
  //       expect(initializedSourcererScope).toEqual(mockSourcererScope(testId));
  //     });
  //   });
  //   it('getSourcererScopeById: uninitialized source group returns defaults', async () => {
  //     await act(async () => {
  //       const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
  //         () => useInitSourcerer(),
  //         {
  //           wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  //         }
  //       );
  //       await waitForNextUpdate();
  //       await waitForNextUpdate();
  //       await waitForNextUpdate();
  //       const uninitializedSourcererScope = result.current.getSourcererScopeById(uninitializedId);
  //       expect(uninitializedSourcererScope).toEqual(
  //         getSourceDefaults(uninitializedId, mockPatterns)
  //       );
  //     });
  //   });
  //   // it('initializeSourcererScope: initializes source group', async () => {
  //   //   await act(async () => {
  //   //     const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
  //   //       () => useSourcerer(),
  //   //       {
  //   //         wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  //   //       }
  //   //     );
  //   //     await waitForNextUpdate();
  //   //     await waitForNextUpdate();
  //   //     await waitForNextUpdate();
  //   //     result.current.initializeSourcererScope(
  //   //       uninitializedId,
  //   //       mockSourcererScopes[uninitializedId],
  //   //       true
  //   //     );
  //   //     await waitForNextUpdate();
  //   //     const initializedSourcererScope = result.current.getSourcererScopeById(uninitializedId);
  //   //     expect(initializedSourcererScope.selectedPatterns).toEqual(
  //   //       mockSourcererScopes[uninitializedId]
  //   //     );
  //   //   });
  //   // });
  //   it('setActiveSourcererScopeId: active source group id gets set only if it gets initialized first', async () => {
  //     await act(async () => {
  //       const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
  //         () => useInitSourcerer(),
  //         {
  //           wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  //         }
  //       );
  //       await waitForNextUpdate();
  //       expect(result.current.activeSourcererScopeId).toEqual(testId);
  //       result.current.setActiveSourcererScopeId(uninitializedId);
  //       expect(result.current.activeSourcererScopeId).toEqual(testId);
  //       // result.current.initializeSourcererScope(uninitializedId);
  //       result.current.setActiveSourcererScopeId(uninitializedId);
  //       expect(result.current.activeSourcererScopeId).toEqual(uninitializedId);
  //     });
  //   });
  //   it('updateSourcererScopeIndices: updates source group indices', async () => {
  //     await act(async () => {
  //       const { result, waitForNextUpdate } = renderHook<string, UseSourcerer>(
  //         () => useInitSourcerer(),
  //         {
  //           wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  //         }
  //       );
  //       await waitForNextUpdate();
  //       await waitForNextUpdate();
  //       await waitForNextUpdate();
  //       let sourceGroup = result.current.getSourcererScopeById(testId);
  //       expect(sourceGroup.selectedPatterns).toEqual(mockSourcererScopes[testId]);
  //       expect(sourceGroup.scopePatterns).toEqual(mockSourcererScopes[testId]);
  //       result.current.updateSourcererScopeIndices({
  //         id: testId,
  //         selectedPatterns: ['endgame-*', 'filebeat-*'],
  //       });
  //       await waitForNextUpdate();
  //       sourceGroup = result.current.getSourcererScopeById(testId);
  //       expect(sourceGroup.scopePatterns).toEqual(mockSourcererScopes[testId]);
  //       expect(sourceGroup.selectedPatterns).toEqual(['endgame-*', 'filebeat-*']);
  //     });
  //   });
  // });
});
