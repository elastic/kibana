/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';

import { getScopeFromPath, useInitSourcerer } from '.';
import { mockPatterns } from './mocks';
// import { SourcererScopeName } from '../../store/sourcerer/model';
import { RouteSpyState } from '../../utils/route/types';
import { SecurityPageName } from '../../../../common/constants';
import { createStore, State } from '../../store';
import {
  useUserInfo,
  initialState as userInfoState,
} from '../../../detections/components/user_info';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../mock';
import { SourcererScopeName } from '../../store/sourcerer/model';

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
const mockDispatch = jest.fn();
const mockUseUserInfo = useUserInfo as jest.Mock;
jest.mock('../../../detections/components/user_info');
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
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
  }),
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
              unsubscribe: jest.fn(),
            })),
          })),
        },
      },
      notifications: {},
    },
  }),
  useUiSetting$: jest.fn().mockImplementation(() => [mockPatterns]),
}));

describe('Sourcerer Hooks', () => {
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
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    mockUseUserInfo.mockImplementation(() => userInfoState);
  });
  it('initializes loading default and timeline index patterns', async () => {
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<string, void>(() => useInitSourcerer(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      });
      await waitForNextUpdate();
      rerender();
      expect(mockDispatch).toBeCalledTimes(2);
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
        payload: { id: 'default', loading: true },
      });
      expect(mockDispatch.mock.calls[1][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
        payload: { id: 'timeline', loading: true },
      });
    });
  });
  it('sets signal index name', async () => {
    await act(async () => {
      mockUseUserInfo.mockImplementation(() => ({
        ...userInfoState,
        loading: false,
        signalIndexName: 'signals-*',
      }));
      const { rerender, waitForNextUpdate } = renderHook<string, void>(() => useInitSourcerer(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      });
      await waitForNextUpdate();
      rerender();
      expect(mockDispatch.mock.calls[2][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SIGNAL_INDEX_NAME',
        payload: { signalIndexName: 'signals-*' },
      });
      expect(mockDispatch.mock.calls[3][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_INDEX_PATTERNS',
        payload: { id: 'timeline', selectedPatterns: ['signals-*'] },
      });
    });
  });
  it('handles detections page', async () => {
    await act(async () => {
      mockUseUserInfo.mockImplementation(() => ({
        ...userInfoState,
        signalIndexName: 'signals-*',
        isSignalIndexExists: true,
      }));
      const { rerender, waitForNextUpdate } = renderHook<string, void>(
        () => useInitSourcerer(SourcererScopeName.detections),
        {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        }
      );
      await waitForNextUpdate();
      rerender();
      expect(mockDispatch.mock.calls[1][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_INDEX_PATTERNS',
        payload: { id: 'detections', selectedPatterns: ['signals-*'] },
      });
    });
  });
});

describe('getScopeFromPath', () => {
  it('should return default scope', async () => {
    expect(getScopeFromPath('/')).toBe(SourcererScopeName.default);
    expect(getScopeFromPath('/exceptions')).toBe(SourcererScopeName.default);
    expect(getScopeFromPath('/rules')).toBe(SourcererScopeName.default);
    expect(getScopeFromPath('/rules/create')).toBe(SourcererScopeName.default);
  });

  it('should return detections scope', async () => {
    expect(getScopeFromPath('/alerts')).toBe(SourcererScopeName.detections);
    expect(getScopeFromPath('/rules/id/foo')).toBe(SourcererScopeName.detections);
    expect(getScopeFromPath('/rules/id/foo/edit')).toBe(SourcererScopeName.detections);
  });
});
