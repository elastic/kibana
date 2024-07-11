/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactRedux from 'react-redux';
import { waitFor } from '@testing-library/react';
import { render } from '../../../../utils/testing/rtl_helpers';
import { MonitorOverviewItem } from '../types';
import { OverviewGrid } from './overview_grid';
import * as useMonitorsSortedByStatus from '../../../../hooks/use_monitors_sorted_by_status';
import { MonitorOverviewState } from '../../../../state';

describe('Overview Grid', () => {
  const locationIdToName: Record<string, string> = {
    us_central: 'Us Central',
    us_east: 'US East',
  };
  const getMockData = (): MonitorOverviewItem[] => {
    const data: MonitorOverviewItem[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        id: `${i}`,
        configId: `${i}`,
        location: {
          id: 'us_central',
          isServiceManaged: true,
        },
        name: `Monitor ${i}`,
        isEnabled: true,
        isStatusAlertEnabled: true,
        type: 'browser',
        tags: [],
        schedule: '60',
      });
      data.push({
        id: `${i}`,
        configId: `${i}`,
        location: {
          id: 'us_east',
          isServiceManaged: true,
        },
        name: `Monitor ${i}`,
        isEnabled: true,
        isStatusAlertEnabled: true,
        type: 'browser',
        tags: [],
        schedule: '60',
      });
    }
    return data;
  };

  const getMockChart = (): Array<{ x: number; y: number }> => {
    const hits = [];
    for (let i = 0; i < 20; i++) {
      hits.push({
        x: i,
        y: i,
      });
    }
    return hits;
  };

  const useSelectorMockImplementation = (selector: any) => {
    const monitors = getMockData();
    if (selector.name === 'selectOverviewState') {
      const overviewState: MonitorOverviewState = {
        flyoutConfig: null,
        data: {
          monitors,
          total: monitors.length,
          allMonitorIds: monitors.map((monitor) => monitor.configId),
        },
        pageState: {
          perPage: 20,
          sortOrder: 'desc',
          sortField: 'status',
        },
        loading: false,
        loaded: true,
        error: null,
        groupBy: {
          field: 'none',
          order: 'asc',
        },
        trendStats: {},
      };
      return overviewState;
    } else if (selector.name === 'selectOverviewStatus') {
      return {
        status: {
          allConfigs: monitors.reduce((acc: Record<string, any>, cur) => {
            acc[`${cur.configId}`] = {
              configId: cur.configId,
              monitorQueryId: cur.id,
              location: locationIdToName[cur.location.id],
              status: 'down',
            };
            return acc;
          }, {}),
          allIds: monitors.map((monitor) => monitor.configId),
          allMonitorsCount: monitors.length,
          disabledCount: 0,
          disabledMonitorQueryIds: [],
          disabledMonitorsCount: 0,
          down: 0,
          downConfigs: {},
          enabledMonitorQueryIds: monitors.map((monitor) => monitor.configId),
          pending: 0,
          pendingConfigs: {},
          projectMonitorsCount: 0,
          up: monitors.length,
          upConfigs: monitors.map((monitor) => monitor.configId),
        },
      };
    }
    const overviewState: Record<
      string,
      null | { data: any[]; median: number; avg: number; min: number; max: number }
    > = {};
    monitors.forEach((monitor) => {
      const key = `${monitor.configId}${monitor.location.id}`;
      if (!overviewState[key]) {
        overviewState[key] = {
          data: getMockChart(),
          avg: 30000,
          min: 0,
          max: 50000,
          median: 15000,
        };
      }
    });
    return overviewState;
  };

  const perPage = 20;

  it('renders correctly', async () => {
    jest.spyOn(useMonitorsSortedByStatus, 'useMonitorsSortedByStatus').mockReturnValue({
      monitorsSortedByStatus: getMockData(),
      downMonitors: {},
    });
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(useSelectorMockImplementation);

    const { getByText, getByTestId } = render(<OverviewGrid />, {
      state: {
        overview: {
          pageState: {
            perPage,
          },
          data: {
            monitors: getMockData(),
            allMonitorIds: [], // not critical for this test
            total: getMockData().length,
          },
          loaded: true,
          loading: false,
        },
        overviewStatus: {
          status: {
            downConfigs: {},
            upConfigs: {},
            allConfigs: getMockData().reduce((acc, cur) => {
              acc[`${cur.id}-${locationIdToName[cur.location.id]}`] = {
                configId: cur.configId,
                monitorQueryId: cur.id,
                location: locationIdToName[cur.location.id],
                status: 'down',
              };
              return acc;
            }, {} as Record<string, any>),
          },
        },
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    await waitFor(() => {
      expect(getByText('Showing')).toBeInTheDocument();
      expect(getByText('40')).toBeInTheDocument();
      expect(getByText('Monitors')).toBeInTheDocument();
      getMockData()
        // since <OverviewGrid /> uses react-window, it only renders the visible items,
        // thus, monitors that would be significantly below the fold will not render without scrolling
        .slice(0, 27)
        .forEach((monitor) => {
          expect(getByTestId(`${monitor.name}-${monitor.location.id}-metric-item`));
        });
    });
  });

  it('displays showing all monitors label when reaching the end of the list', async () => {
    jest.spyOn(useMonitorsSortedByStatus, 'useMonitorsSortedByStatus').mockReturnValue({
      monitorsSortedByStatus: getMockData(),
      downMonitors: {},
    });
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(useSelectorMockImplementation);

    const { getByText } = render(<OverviewGrid />, {
      state: {
        overview: {
          pageState: {
            perPage,
          },
          data: {
            monitors: getMockData().slice(0, 16),
            allMonitorIds: [], // not critical for this test
            total: getMockData().length,
          },
          loaded: true,
          loading: false,
        },
        overviewStatus: {
          status: {
            downConfigs: {},
            upConfigs: {},
            allConfigs: getMockData().reduce((acc, cur) => {
              acc[`${cur.id}-${locationIdToName[cur.location.id]}`] = {
                configId: cur.configId,
                monitorQueryId: cur.id,
                location: locationIdToName[cur.location.id],
                status: 'down',
              };
              return acc;
            }, {} as Record<string, any>),
          },
        },
        serviceLocations: {
          locations: [
            {
              id: 'us_central',
              label: 'Us Central',
            },
            {
              id: 'us_east',
              label: 'US East',
            },
          ],
          locationsLoaded: true,
          loading: false,
        },
      },
    });

    expect(getByText('Showing all monitors')).toBeInTheDocument();
  });
});
