/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorPendingWrapper } from './monitor_pending_wrapper';
import * as selectedMonitorHooks from './hooks/use_selected_monitor';
import * as locationHooks from './hooks/use_selected_location';

describe('MonitorPendingWrapper', () => {
  const TestComponent = () => {
    return <div>children</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(selectedMonitorHooks, 'useSelectedMonitor').mockReturnValue({
      monitor: {
        id: '4afd3980-0b72-11ed-9c10-b57918ea89d6',
      },
    } as ReturnType<typeof selectedMonitorHooks.useSelectedMonitor>);
    jest.spyOn(locationHooks, 'useSelectedLocation').mockReturnValue({
      label: 'North America - US Central',
    } as ReturnType<typeof locationHooks.useSelectedLocation>);
  });

  it('displays loading when initial ping is loading', async () => {
    const { getByText, queryByText, getByTestId } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>,
      {
        state: {
          monitorDetails: {
            lastRun: {
              loaded: false,
              loading: true,
              data: undefined,
            },
          },
        },
      }
    );

    // page is loading
    expect(getByText(/Loading/)).toBeInTheDocument();
    expect(queryByText(/Initial test run pending/)).not.toBeInTheDocument();
    expect(getByTestId('syntheticsPendingWrapperChildren')).toHaveAttribute(
      'style',
      'display: none;'
    );
  });

  it('displays pending when latest ping is unavailable', async () => {
    const { getByText, queryByText, getByTestId } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>,
      {
        state: {
          monitorDetails: {
            lastRun: {
              loaded: true,
              loading: false,
              // overwrite default from
              // merged properties for default
              // mock state
              // @ts-ignore
              data: null,
            },
          },
        },
      }
    );

    // page is loaded with pending run
    expect(queryByText(/Loading/)).not.toBeInTheDocument();
    expect(getByTestId('syntheticsPendingWrapperChildren')).toHaveAttribute(
      'style',
      'display: none;'
    );
    expect(getByText(/Initial test run pending/)).toBeInTheDocument();
  });

  it('displays children when latestPing is available', async () => {
    const { queryByText, getByTestId } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>,
      {
        state: {
          monitorDetails: {
            lastRun: {
              loaded: true,
              loading: false,
              data: {},
            },
          },
        },
      }
    );

    // page is loaded with latest ping defined
    expect(queryByText(/Loading/)).not.toBeInTheDocument();
    expect(queryByText(/Initial test run pending/)).not.toBeInTheDocument();
    expect(getByTestId('syntheticsPendingWrapperChildren')).not.toHaveAttribute(
      'style',
      'display: none;'
    );
  });
});
