/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { DEFAULT_THROTTLING } from '../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { MonitorAsyncError } from './monitor_async_error';

describe('<MonitorAsyncError />', () => {
  const location1 = 'US Central';
  const location2 = 'US North';
  const reason1 = 'Unauthorized';
  const reason2 = 'Forbidden';
  const status1 = 401;
  const status2 = 403;
  const state = {
    monitorManagementList: {
      throttling: DEFAULT_THROTTLING,
      enablement: null,
      list: {
        perPage: 5,
        page: 1,
        total: 6,
        monitors: [],
        syncErrors: [
          {
            locationId: 'us_central',
            error: {
              reason: reason1,
              status: status1,
            },
          },
          {
            locationId: 'us_north',
            error: {
              reason: reason2,
              status: status2,
            },
          },
        ],
      },
      locations: [
        {
          id: 'us_central',
          label: location1,
          geo: {
            lat: 0,
            lon: 0,
          },
          url: '',
          isServiceManaged: true,
        },
        {
          id: 'us_north',
          label: location2,
          geo: {
            lat: 0,
            lon: 0,
          },
          url: '',
          isServiceManaged: true,
        },
      ],
      error: {
        serviceLocations: null,
        monitorList: null,
        enablement: null,
      },
      loading: {
        monitorList: true,
        serviceLocations: false,
        enablement: false,
      },
      syntheticsService: {
        loading: false,
        signupUrl: null,
      },
    } as MonitorManagementListState,
  };

  it('renders when errors are defined', () => {
    render(<MonitorAsyncError />, { state });

    expect(screen.getByText(new RegExp(reason1))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${status1}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(reason2))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${status2}`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(location1))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(location2))).toBeInTheDocument();
  });

  it('renders null when errors are empty', () => {
    render(<MonitorAsyncError />, {
      state: {
        ...state,
        monitorManagementList: {
          ...state.monitorManagementList,
          list: {
            ...state.monitorManagementList.list,
            syncErrors: [],
          },
        },
      },
    });

    expect(screen.queryByText(new RegExp(reason1))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(`${status1}`))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(reason2))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(`${status2}`))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(location1))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(location2))).not.toBeInTheDocument();
  });
});
