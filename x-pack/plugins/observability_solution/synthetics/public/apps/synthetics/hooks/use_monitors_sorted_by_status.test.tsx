/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react';
import { SyntheticsUrlParams } from '../utils/url_params/get_supported_url_params';
import { useMonitorsSortedByStatus } from './use_monitors_sorted_by_status';
import { WrappedHelper } from '../utils/testing';
import * as URL from './use_url_params';

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

  let useGetUrlParamsSpy: jest.SpyInstance<SyntheticsUrlParams>;

  beforeEach(() => {
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');

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
            data: {
              total: 0,
              allMonitorIds: [],
              monitors: [
                {
                  configId: 'test-monitor-1',
                  id: 'test-monitor-1',
                  name: 'Test monitor 1',
                  location: location1,
                  isEnabled: false,
                },
                {
                  configId: 'test-monitor-1',
                  id: 'test-monitor-1',
                  name: 'Test monitor 1',
                  location: location2,
                  isEnabled: true,
                },
                {
                  configId: 'test-monitor-2',
                  id: 'test-monitor-2',
                  name: 'Test monitor 2',
                  location: location1,
                  isEnabled: true,
                },
                {
                  configId: 'test-monitor-2',
                  id: 'test-monitor-2',
                  name: 'Test monitor 2',
                  location: location2,
                  isEnabled: true,
                },
                {
                  configId: 'test-monitor-3',
                  id: 'test-monitor-3',
                  name: 'Test monitor 3',
                  location: location1,
                  isEnabled: true,
                },
                {
                  configId: 'test-monitor-3',
                  id: 'test-monitor-3',
                  name: 'Test monitor 3',
                  location: location2,
                  isEnabled: true,
                },
                {
                  configId: 'test-monitor-4',
                  id: 'test-monitor-4',
                  name: 'Test monitor 4',
                  location: location1,
                  isEnabled: true,
                },
              ],
            },
            error: null,
            loaded: false,
            loading: false,
          },
          overviewStatus: {
            status: {
              upConfigs: {
                [`test-monitor-1-${location2.id}`]: {
                  configId: 'test-monitor-1',
                  monitorQueryId: 'test-monitor-1',
                  locationId: location2.id,
                },
                [`test-monitor-2-${location2.id}`]: {
                  configId: 'test-monitor-2',
                  monitorQueryId: 'test-monitor-2',
                  locationId: location2.id,
                },
                [`test-monitor-3-${location2.id}`]: {
                  configId: 'test-monitor-3',
                  monitorQueryId: 'test-monitor-3',
                  locationId: location2.id,
                },
              },
              downConfigs: {
                [`test-monitor-1-${location1.id}`]: {
                  configId: 'test-monitor-1',
                  monitorQueryId: 'test-monitor-1',
                  locationId: location1.id,
                },
                [`test-monitor-2-${location1.id}`]: {
                  configId: 'test-monitor-2',
                  monitorQueryId: 'test-monitor-2',
                  locationId: location1.id,
                },
                [`test-monitor-3${location1.id}`]: {
                  configId: 'test-monitor-3',
                  monitorQueryId: 'test-monitor-3',
                  locationId: location1.id,
                },
              },
              pendingConfigs: {
                [`test-monitor-4-${location1.id}`]: {
                  configId: 'test-monitor-4',
                  monitorQueryId: 'test-monitor-4',
                  locationId: location1.id,
                },
              },
            },
          },
        }}
      >
        {children}
      </WrappedHelper>
    );
  };

  it('returns monitors down first when sort order is asc', () => {
    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: WrapperWithState,
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          configId: 'test-monitor-2',
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location1,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-3',
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location1,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-1',
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-2',
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-3',
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-1',
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location1,
          isEnabled: false,
        },
        {
          configId: 'test-monitor-4',
          id: 'test-monitor-4',
          name: 'Test monitor 4',
          location: location1,
          isEnabled: true,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['us_central'],
        'test-monitor-2': ['us_central'],
        'test-monitor-3': ['us_central'],
      },
    });
  });

  it('returns monitors up first when sort order is desc', () => {
    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: { children: React.ReactElement }) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          configId: 'test-monitor-1',
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-2',
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-3',
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-2',
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location1,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-3',
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location1,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-1',
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location1,
          isEnabled: false,
        },
        {
          configId: 'test-monitor-4',
          id: 'test-monitor-4',
          name: 'Test monitor 4',
          location: location1,
          isEnabled: true,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['us_central'],
        'test-monitor-2': ['us_central'],
        'test-monitor-3': ['us_central'],
      },
    });
  });

  it('returns only up monitors when statusFilter is down', () => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: 'up',
    } as SyntheticsUrlParams);

    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: { children: React.ReactElement }) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          configId: 'test-monitor-1',
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-2',
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location2,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-3',
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location2,
          isEnabled: true,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['us_central'],
        'test-monitor-2': ['us_central'],
        'test-monitor-3': ['us_central'],
      },
    });
  });

  it('returns only down monitors when statusFilter is down', () => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: 'down',
    } as SyntheticsUrlParams);

    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: { children: React.ReactElement }) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          configId: 'test-monitor-2',
          id: 'test-monitor-2',
          name: 'Test monitor 2',
          location: location1,
          isEnabled: true,
        },
        {
          configId: 'test-monitor-3',
          id: 'test-monitor-3',
          name: 'Test monitor 3',
          location: location1,
          isEnabled: true,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['us_central'],
        'test-monitor-2': ['us_central'],
        'test-monitor-3': ['us_central'],
      },
    });
  });

  it('returns only disabled monitors when statusFilter is down', () => {
    useGetUrlParamsSpy.mockReturnValue({
      statusFilter: 'disabled',
    } as SyntheticsUrlParams);

    const { result } = renderHook(() => useMonitorsSortedByStatus(), {
      wrapper: ({ children }: { children: React.ReactElement }) => (
        <WrapperWithState sortOrder="desc">{children}</WrapperWithState>
      ),
    });
    expect(result.current).toEqual({
      monitorsSortedByStatus: [
        {
          configId: 'test-monitor-1',
          id: 'test-monitor-1',
          name: 'Test monitor 1',
          location: location1,
          isEnabled: false,
        },
      ],
      downMonitors: {
        'test-monitor-1': ['us_central'],
        'test-monitor-2': ['us_central'],
        'test-monitor-3': ['us_central'],
      },
    });
  });
});
