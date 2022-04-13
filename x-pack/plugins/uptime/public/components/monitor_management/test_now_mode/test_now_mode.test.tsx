/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { TestNowMode } from './test_now_mode';
import { kibanaService } from '../../../state/kibana_service';
import { Locations, MonitorFields } from '../../../../common/runtime_types';
import * as runOnceErrorHooks from '../hooks/use_run_once_errors';

describe('TestNowMode', function () {
  const locations: Locations = [
    {
      id: 'test-location-id',
      label: 'Test Location',
      geo: { lat: 33.333, lon: 73.333 },
      url: 'test-url',
      isServiceManaged: true,
    },
  ];
  const testMonitor = {
    id: 'test-monitor-id',
    type: 'browser',
    locations,
  } as unknown as MonitorFields;
  const testRun = { id: 'test-run-id', monitor: testMonitor };
  const onDone = jest.fn();

  beforeEach(() => {
    jest.spyOn(runOnceErrorHooks, 'useRunOnceErrors').mockReturnValue({
      expectPings: 1,
      hasBlockingError: false,
      blockingErrorMessage: '',
      errorMessages: [],
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render properly', async function () {
    render(<TestNowMode testRun={testRun} isMonitorSaved={false} onDone={onDone} />);
    expect(await screen.findByText('PENDING')).toBeInTheDocument();

    expect(await screen.findByText('0 steps completed')).toBeInTheDocument();

    expect(kibanaService.core.http.post).toHaveBeenCalledTimes(1);

    expect(kibanaService.core.http.post).toHaveBeenLastCalledWith(
      expect.stringContaining('/internal/uptime/service/monitors/run_once/'),
      { body: JSON.stringify(testMonitor), method: 'POST' }
    );
  });
});
