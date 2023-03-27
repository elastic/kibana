/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../utils/testing/rtl_helpers';
import { MonitorPendingWrapper } from './monitor_pending_wrapper';

describe('MonitorPendingWrapper', () => {
  const TestComponent = () => {
    return <div>test</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading when initial ping is loading', async () => {
    const { getByText } = render(
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
  });

  it('displays pending when latest ping is unavailable', async () => {
    const { getByText } = render(
      <MonitorPendingWrapper>
        <TestComponent />
      </MonitorPendingWrapper>,
      {
        state: {
          monitorDetails: {
            lastRun: {
              loaded: true,
              loading: false,
              data: null,
            },
          },
        },
      }
    );

    // page is loaded with pending run
    expect(getByText(/Initial test run pending/)).toBeInTheDocument();
  });

  it('displays children when latestPing is available', async () => {
    const { getByText } = render(
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
    expect(getByText(/test/)).toBeInTheDocument();
  });
});
