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
import { MonitorFields } from '../../../../common/runtime_types';

describe('TestNowMode', function () {
  const onDone = jest.fn();

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render properly', async function () {
    render(
      <TestNowMode
        testRun={{ id: 'test-run', monitor: { type: 'browser' } as MonitorFields }}
        isMonitorSaved={false}
        onDone={onDone}
      />
    );
    expect(await screen.findByText('Test result')).toBeInTheDocument();
    expect(await screen.findByText('PENDING')).toBeInTheDocument();

    expect(await screen.findByText('0 steps completed')).toBeInTheDocument();

    expect(kibanaService.core.http.post).toHaveBeenCalledTimes(1);

    expect(kibanaService.core.http.post).toHaveBeenLastCalledWith(
      expect.stringContaining('/internal/uptime/service/monitors/run_once/'),
      { body: '{"type":"browser"}', method: 'POST' }
    );
  });
});
