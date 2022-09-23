/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../utils/testing/rtl_helpers';
import { MonitorOverviewItem } from '../types';
import { OverviewGrid } from './overview_grid';
import * as hooks from '../../../../hooks/use_last_50_duration_chart';

describe('Overview Grid', () => {
  const getMockData = (): MonitorOverviewItem[] => {
    const data: MonitorOverviewItem[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        id: `${i}`,
        location: {
          id: 'us_central',
          isServiceManaged: true,
        },
        name: `Monitor ${i}`,
        isEnabled: true,
      });
      data.push({
        id: `${i}`,
        location: {
          id: 'us_east',
          isServiceManaged: true,
        },
        name: `Monitor ${i}`,
        isEnabled: true,
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

  it('renders correctly', async () => {
    jest
      .spyOn(hooks, 'useLast50DurationChart')
      .mockReturnValue({ data: getMockChart(), averageDuration: 30000, loading: false });

    const { getByText, getAllByTestId } = render(<OverviewGrid />, {
      state: {
        overview: {
          pageState: {
            perPage: 20,
          },
          data: {
            pages: {
              0: getMockData().slice(0, 20),
              1: getMockData().slice(20, 40),
            },
            allMonitorIds: [], // not critical for this test
            total: getMockData().length,
          },
          loaded: true,
          loading: false,
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

    expect(getByText(/1-20/)).toBeInTheDocument();
    expect(getByText(/of 40/)).toBeInTheDocument();
    expect(getByText('Rows per page: 20')).toBeInTheDocument();
    expect(getAllByTestId('syntheticsOverviewGridItem').length).toEqual(20);
  });
});
