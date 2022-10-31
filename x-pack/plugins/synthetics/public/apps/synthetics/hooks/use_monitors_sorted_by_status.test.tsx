/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useMonitorsSortedByStatus } from './use_monitors_sorted_by_status';
import { WrappedHelper } from '../utils/testing';

describe('useMonitorsSortedByStatus', () => {
  const location1 = {
    url: 'mockUrl',
    id: 'us_central',
    label: 'US Central',
    isServiceManaged: true,
  };

  const location2 = {
    url: 'mockUrl',
    id: 'us_east',
    label: 'US East',
    isServiceManaged: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const WrapperWithState = ({
    children,
    sortOrder = 'asc',
  }: {
    children: React.ReactElement;
    sortOrder: 'asc' | 'desc';
  }) => {
    return (
      <WrappedHelper
        state={{
          serviceLocations: {
            locationsLoaded: true,
            loading: false,
            locations: [location1, location2],
          },
          overview: {
            pageState: {
              perPage: 10,
              sortOrder,
              sortField: 'name.keyword',
            },
            status: {
              upConfigs: [
                {
                  configId: 'test-monitor-1',
                  heartbeatId: 'test-monitor-1',
                  location: location2.label,
                },
                {
                  configId: 'test-monitor-2',
                  heartbeatId: 'test-monitor-2',
                  location: location2.label,
                },
                {
                  configId: 'test-monitor-2',
                  heartbeatId: 'test-monitor-2',
                  location: location2.label,
                },
              ],
              downConfigs: [
                {
                  configId: 'test-monitor-1',
                  heartbeatId: 'test-monitor-1',
                  location: location1.label,
                },
                {
                  configId: 'test-monitor-2',
                  heartbeatId: 'test-monitor-2',
                  location: location1.label,
                },
                {
                  configId: 'test-monitor-2',
                  heartbeatId: 'test-monitor-2',
                  location: location1.label,
                },
              ],
            },
            data: {
              total: 0,
              allMonitorIds: [],
              monitors: [
                {
                  id: 'test-monitor-1',
                  name: 'Test monitor 1',
                  location: location1,
                  isEnabled: false,
                },
                {
                  id: 'test-monitor-1',
                  name: 'Test monitor 1',
                  location: location2,
                  isEnabled: true,
                },
                {
                  id: 'test-monitor-2',
                  name: 'Test monitor 2',
                  location: location1,
                  isEnabled: true,
                },
                {
                  id: 'test-monitor-2',
                  name: 'Test monitor 2',
                  location: location2,
                  isEnabled: true,
                },
                {
                  id: 'test-monitor-3',
                  name: 'Test monitor 3',
                  location: location1,
                  isEnabled: true,
                },
                {
                  id: 'test-monitor-3',
                  name: 'Test monitor 3',
                  location: location2,
                  isEnabled: true,
                },
              ],
            },
            error: null,
            loaded: false,
            loading: false,
          },
        }}
      >
        {children}
      </WrappedHelper>
    );
  };

  it('returns monitors down first when sort order is asc', () => {
    const { result } = renderHook(() => useMonitorsSortedByStatus(true), {
      wrapper: WrapperWithState,
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location1,
          isEnabled: true,
        },
        {
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location1,
          isEnabled: true,
        },
        {
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location2,
          isEnabled: true,
        },
        {
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location2,
          isEnabled: true,
        },
        {
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location2,
          isEnabled: true,
        },
        {
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location1,
          isEnabled: false,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['US Central'],
        'test-monitor-2': ['US Central'],
        'test-monitor-3': ['US Central'],
      },
    });
  });

  it('returns monitors up first when sort order is desc', () => {
    const { result } = renderHook(() => useMonitorsSortedByStatus(true), {
      wrapper: ({ children }: { children: React.ReactElement }) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location2,
          isEnabled: true,
        },
        {
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location2,
          isEnabled: true,
        },
        {
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location2,
          isEnabled: true,
        },
        {
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location1,
          isEnabled: true,
        },
        {
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location1,
          isEnabled: true,
        },
        {
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location1,
          isEnabled: false,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['US Central'],
        'test-monitor-2': ['US Central'],
        'test-monitor-3': ['US Central'],
      },
    });
  });
});
