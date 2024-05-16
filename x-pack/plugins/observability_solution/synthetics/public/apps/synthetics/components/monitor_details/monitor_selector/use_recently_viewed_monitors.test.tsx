/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import * as localStorageModule from 'react-use/lib/useLocalStorage';
import { fetchMonitorManagementList } from '../../../state';

import * as useMonitorQueryModule from '../hooks/use_monitor_query_id';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { WrappedHelper } from '../../../utils/testing';
import { MONITOR_ROUTE } from '../../../../../../common/constants';

jest.mock('../../../state', () => ({
  ...jest.requireActual('../../../state'),
  fetchMonitorManagementList: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

describe('useRecentlyViewedMonitors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns expected result', () => {
    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper url="/monitor/1" path={MONITOR_ROUTE}>
          {children}
        </WrappedHelper>
      );
    };

    jest.spyOn(useMonitorQueryModule, 'useMonitorQueryId').mockReturnValue('1');
    (useFetcher as jest.Mock).mockImplementation((callback) => {
      callback();
      return { loading: false, status: 'success' as FETCH_STATUS.SUCCESS, refetch: () => {} };
    });

    const { result } = renderHook(() => useRecentlyViewedMonitors(), { wrapper: WrapperWithState });
    expect(result.current).toEqual({ loading: false, recentMonitorOptions: [] });
  });

  it('fetches the persisted ids and persists the updated information', async () => {
    const currentMonitorQueryId = 'id-01';
    const monitorQueryId3 = 'persisted-id-03';
    let persistedIds = ['persisted-id-02', monitorQueryId3];
    const setPersistedIdsMock = jest.fn().mockImplementation((ids: string[]) => {
      persistedIds = ids;
    });

    jest
      .spyOn(useMonitorQueryModule, 'useMonitorQueryId')
      .mockImplementation(() => currentMonitorQueryId);

    jest
      .spyOn(localStorageModule, 'default')
      .mockImplementation(() => [persistedIds, setPersistedIdsMock, () => {}]);

    (useFetcher as jest.Mock).mockImplementation((callback) => {
      callback();
      return { loading: false, status: 'success' as FETCH_STATUS.SUCCESS, refetch: () => {} };
    });

    // Return only 'persisted-id-03' to mark 'persisted-id-02' as a deleted monitor
    const fetchedMonitor = {
      id: monitorQueryId3,
      name: 'Monitor 03',
      locations: [],
    };
    (fetchMonitorManagementList as jest.Mock).mockReturnValue({
      monitors: [fetchedMonitor],
    });

    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper url="/monitor/1" path={MONITOR_ROUTE}>
          {children}
        </WrappedHelper>
      );
    };
    const { result, waitForValueToChange, rerender } = renderHook(
      () => useRecentlyViewedMonitors(),
      {
        wrapper: WrapperWithState,
      }
    );
    await waitForValueToChange(() => persistedIds);

    // Sets the current monitor as well as updated information
    expect(setPersistedIdsMock).toHaveBeenCalledWith([currentMonitorQueryId, monitorQueryId3]);

    rerender();
    const expectedOptions = [
      {
        isGroupLabel: true,
        key: 'recently_viewed',
        label: 'Recently viewed',
      },
      {
        isGroupLabel: false,
        key: fetchedMonitor.id,
        label: fetchedMonitor.name,
        locationIds: fetchedMonitor.locations,
        monitorQueryId: monitorQueryId3,
      },
    ];
    expect(result.current).toEqual({ loading: false, recentMonitorOptions: expectedOptions });
  });
});
