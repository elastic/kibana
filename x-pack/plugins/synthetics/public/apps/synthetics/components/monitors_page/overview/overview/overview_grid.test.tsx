/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../utils/testing/rtl_helpers';
import { waitFor } from '@testing-library/react';
import { MonitorOverviewItem } from '../types';
import { OverviewGrid } from './overview_grid';
import * as hooks from '../../../../hooks/use_last_50_duration_chart';

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

  const perPage = 20;

  it('renders correctly', async () => {
    jest
      .spyOn(hooks, 'useLast50DurationChart')
      .mockReturnValue({ data: getMockChart(), averageDuration: 30000, loading: false });

    const { getByText, getAllByTestId, queryByText } = render(<OverviewGrid />, {
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
      expect(queryByText('Showing all monitors')).not.toBeInTheDocument();
      expect(getAllByTestId('syntheticsOverviewGridItem').length).toEqual(perPage);
    });
  });

  it('displays showing all monitors label when reaching the end of the list', async () => {
    jest
      .spyOn(hooks, 'useLast50DurationChart')
      .mockReturnValue({ data: getMockChart(), averageDuration: 30000, loading: false });

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
