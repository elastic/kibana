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
import { RouteSpyState } from '../../utils/route/types';
import {
  DEFAULT_DATA_VIEW_ID,
  DEFAULT_INDEX_PATTERN,
  SecurityPageName,
} from '../../../../common/constants';
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
  mockSourcererState,
} from '../../mock';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { isSignalIndex } from '../../store/sourcerer/helpers';

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
        },
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
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
      expect(mockDispatch).toBeCalledTimes(3);
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
        payload: { id: 'default', loading: true },
      });
      expect(mockDispatch.mock.calls[1][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
        payload: { id: 'timeline', loading: true },
      });
      expect(mockDispatch.mock.calls[2][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
        payload: {
          id: 'timeline',
          selectedDataViewId: 'security-solution',
          selectedPatterns: [
            '.siem-signals-spacename',
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'traces-apm*',
            'winlogbeat-*',
          ],
        },
      });
    });
  });
  it('sets signal index name', async () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          signalIndexName: null,
          defaultDataView: {
            ...state.sourcerer.defaultDataView,
            id: DEFAULT_DATA_VIEW_ID,
            title: DEFAULT_INDEX_PATTERN.join(','),
            patternList: DEFAULT_INDEX_PATTERN,
          },
        },
      },
      SUB_PLUGINS_REDUCER,
      kibanaObservable,
      storage
    );
    await act(async () => {
      mockUseUserInfo.mockImplementation(() => ({
        ...userInfoState,
        loading: false,
        signalIndexName: mockSourcererState.signalIndexName,
      }));
      const { rerender, waitForNextUpdate } = renderHook<string, void>(() => useInitSourcerer(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      });
      await waitForNextUpdate();
      rerender();
      expect(mockDispatch.mock.calls[3][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
        payload: { loading: true },
      });
      expect(mockDispatch.mock.calls[2][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
        payload: {
          id: 'timeline',
          selectedDataViewId: mockSourcererState.defaultDataView.id,
          selectedPatterns: [
            mockSourcererState.signalIndexName,
            ...mockSourcererState.defaultDataView.patternList.filter(
              (p) => !isSignalIndex(p, mockSourcererState.signalIndexName)
            ),
          ].sort(),
        },
      });
      expect(mockDispatch.mock.calls[4][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SIGNAL_INDEX_NAME',
        payload: { signalIndexName: mockSourcererState.signalIndexName },
      });
    });
  });
  it('handles detections page', async () => {
    await act(async () => {
      mockUseUserInfo.mockImplementation(() => ({
        ...userInfoState,
        signalIndexName: mockSourcererState.signalIndexName,
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
      expect(mockDispatch.mock.calls[3][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
        payload: {
          id: 'detections',
          selectedDataViewId: mockSourcererState.defaultDataView.id,
          selectedPatterns: [mockSourcererState.signalIndexName],
        },
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
