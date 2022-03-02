/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

import { getScopeFromPath, useInitSourcerer, useSourcererDataView } from '.';
import { mockPatterns } from './mocks';
import { RouteSpyState } from '../../utils/route/types';
import { DEFAULT_INDEX_PATTERN, SecurityPageName } from '../../../../common/constants';
import { createStore } from '../../store';
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
import { SelectedDataView, SourcererScopeName } from '../../store/sourcerer/model';
import { postSourcererDataView } from './api';

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
jest.mock('./api');
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

const mockSearch = jest.fn();

const mockAddWarning = jest.fn();
jest.mock('../../lib/kibana', () => ({
  useToasts: () => ({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: mockAddWarning,
  }),
  useKibana: () => ({
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
          search: mockSearch.mockImplementation(() => ({
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
  const { storage } = createSecuritySolutionStorageMock();
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
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
        type: 'x-pack/security_solution/local/sourcerer/SET_DATA_VIEW_LOADING',
        payload: { id: 'security-solution', loading: true },
      });
      expect(mockDispatch.mock.calls[1][0]).toEqual({
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
    const mockNewDataViews = {
      defaultDataView: mockSourcererState.defaultDataView,
      kibanaDataViews: [mockSourcererState.defaultDataView],
    };
    (postSourcererDataView as jest.Mock).mockResolvedValue(mockNewDataViews);

    store = createStore(
      {
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          signalIndexName: null,
          defaultDataView: {
            ...mockGlobalState.sourcerer.defaultDataView,
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
      await waitFor(() => {
        expect(mockDispatch.mock.calls[2][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { loading: true },
        });
        expect(mockDispatch.mock.calls[3][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SIGNAL_INDEX_NAME',
          payload: { signalIndexName: mockSourcererState.signalIndexName },
        });
        expect(mockDispatch.mock.calls[4][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_DATA_VIEW_LOADING',
          payload: {
            id: mockSourcererState.defaultDataView.id,
            loading: true,
          },
        });
        expect(mockDispatch.mock.calls[5][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_DATA_VIEWS',
          payload: mockNewDataViews,
        });
        expect(mockDispatch.mock.calls[6][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { loading: false },
        });
        expect(mockDispatch).toHaveBeenCalledTimes(7);
        expect(mockSearch).toHaveBeenCalledTimes(2);
      });
    });
  });

  it('calls addWarning if defaultDataView has an error', async () => {
    store = createStore(
      {
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          signalIndexName: null,
          defaultDataView: {
            ...mockGlobalState.sourcerer.defaultDataView,
            error: true,
          },
        },
      },
      SUB_PLUGINS_REDUCER,
      kibanaObservable,
      storage
    );
    await act(async () => {
      renderHook<string, void>(() => useInitSourcerer(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      });

      await waitFor(() => {
        expect(mockAddWarning).toHaveBeenNthCalledWith(1, {
          text: 'Users with write permission need to access the Elastic Security app to initialize the app source data.',
          title: 'Write role required to generate data',
        });
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
      expect(mockDispatch.mock.calls[2][0]).toEqual({
        type: 'x-pack/security_solution/local/sourcerer/SET_SELECTED_DATA_VIEW',
        payload: {
          id: 'detections',
          selectedDataViewId: mockSourcererState.defaultDataView.id,
          selectedPatterns: [mockSourcererState.signalIndexName],
        },
      });
    });
  });
  it('index field search is not repeated when default and timeline have same dataViewId', async () => {
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<string, void>(() => useInitSourcerer(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      });
      await waitForNextUpdate();
      rerender();
      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledTimes(1);
      });
    });
  });
  it('index field search called twice when default and timeline have different dataViewId', async () => {
    store = createStore(
      {
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          sourcererScopes: {
            ...mockGlobalState.sourcerer.sourcererScopes,
            [SourcererScopeName.timeline]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
              selectedDataViewId: 'different-id',
            },
          },
        },
      },
      SUB_PLUGINS_REDUCER,
      kibanaObservable,
      storage
    );
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<string, void>(() => useInitSourcerer(), {
        wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      });
      await waitForNextUpdate();
      rerender();
      await waitFor(() => {
        expect(mockSearch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('useSourcererDataView', () => {
    it('Should exclude elastic cloud alias when selected patterns include "logs-*" as an alias', async () => {
      await act(async () => {
        const { result, rerender, waitForNextUpdate } = renderHook<
          SourcererScopeName,
          SelectedDataView
        >(() => useSourcererDataView(), {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await waitForNextUpdate();
        rerender();
        expect(result.current.selectedPatterns).toEqual([
          '-*elastic-cloud-logs-*',
          ...mockGlobalState.sourcerer.sourcererScopes.default.selectedPatterns,
        ]);
      });
    });

    it('Should NOT exclude elastic cloud alias when selected patterns does NOT include "logs-*" as an alias', async () => {
      await act(async () => {
        store = createStore(
          {
            ...mockGlobalState,
            sourcerer: {
              ...mockGlobalState.sourcerer,
              sourcererScopes: {
                ...mockGlobalState.sourcerer.sourcererScopes,
                [SourcererScopeName.default]: {
                  ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
                  selectedPatterns: [
                    'apm-*-transaction*',
                    'auditbeat-*',
                    'endgame-*',
                    'filebeat-*',
                    'packetbeat-*',
                    'traces-apm*',
                    'winlogbeat-*',
                  ],
                },
              },
            },
          },
          SUB_PLUGINS_REDUCER,
          kibanaObservable,
          storage
        );
        const { result, rerender, waitForNextUpdate } = renderHook<
          SourcererScopeName,
          SelectedDataView
        >(() => useSourcererDataView(), {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await waitForNextUpdate();
        rerender();
        expect(result.current.selectedPatterns).toEqual([
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'packetbeat-*',
          'traces-apm*',
          'winlogbeat-*',
        ]);
      });
    });

    it('Should NOT exclude elastic cloud alias when selected patterns include "logs-endpoint.event-*" as an alias', async () => {
      await act(async () => {
        store = createStore(
          {
            ...mockGlobalState,
            sourcerer: {
              ...mockGlobalState.sourcerer,
              sourcererScopes: {
                ...mockGlobalState.sourcerer.sourcererScopes,
                [SourcererScopeName.default]: {
                  ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
                  selectedPatterns: [
                    'apm-*-transaction*',
                    'auditbeat-*',
                    'endgame-*',
                    'filebeat-*',
                    'packetbeat-*',
                    'traces-apm*',
                    'winlogbeat-*',
                    'logs-endpoint.event-*',
                  ],
                },
              },
            },
          },
          SUB_PLUGINS_REDUCER,
          kibanaObservable,
          storage
        );
        const { result, rerender, waitForNextUpdate } = renderHook<
          SourcererScopeName,
          SelectedDataView
        >(() => useSourcererDataView(), {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await waitForNextUpdate();
        rerender();
        expect(result.current.selectedPatterns).toEqual([
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-endpoint.event-*',
          'packetbeat-*',
          'traces-apm*',
          'winlogbeat-*',
        ]);
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
