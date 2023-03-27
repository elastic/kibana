/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Ping } from '../../../../../common/runtime_types';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorPendingWrapper } from './monitor_pending_wrapper';
import * as latestPing from './hooks/use_monitor_latest_ping';

describe('MonitorPendingWrapper', () => {
  const TestComponent = () => {
    return <div>test</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading when initial ping is loading', async () => {
    jest.spyOn(latestPing, 'useMonitorLatestPing').mockReturnValue({
      loaded: false,
      latestPing: undefined,
      loading: true,
    });
    const { getByText } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>
    );

    // page is loading
    expect(getByText(/Loading/)).toBeInTheDocument();
  });

  it('displays pending when latest ping is unavailable', async () => {
    jest.spyOn(latestPing, 'useMonitorLatestPing').mockReturnValue({
      loaded: true,
      latestPing: undefined,
      loading: false,
    });
    const { getByText } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>
    );

    // page is loading
    expect(getByText(/Initial test run pending/)).toBeInTheDocument();
  });

  it('displays children when latestPing is available', async () => {
    jest.spyOn(latestPing, 'useMonitorLatestPing').mockReturnValue({
      loaded: true,
      latestPing: {} as Ping,
      loading: false,
    });
    const { getByText } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>
    );

    // page is loading
    expect(getByText(/test/)).toBeInTheDocument();
  });
});
