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
import { fireEvent } from '@testing-library/dom';
import { kibanaService } from '../../../state/kibana_service';
import { MonitorFields } from '../../../../common/runtime_types';

describe('TestNowMode', function () {
  it('should render properly', async function () {
    render(<TestNowMode />);
    expect(await screen.findByText('Test now')).toBeInTheDocument();
    expect(
      await screen.findByText('Test your monitor and verify the results before saving')
    ).toBeInTheDocument();
    expect(await screen.findByText('Start test run')).toBeInTheDocument();
  });

  it('should send run once request on click', async function () {
    const {} = render(<TestNowMode monitor={{ type: 'browser' } as MonitorFields} />);
    const btn = await screen.findByText('Start test run');
    fireEvent.click(btn);

    expect(await screen.findByText('Update test run')).toBeInTheDocument();

    expect(kibanaService.core.http.post).toHaveBeenCalledTimes(1);
    expect(kibanaService.core.http.post).toHaveBeenLastCalledWith(
      expect.stringContaining('/internal/uptime/service/monitors/run_once/'),
      { body: '{"type":"browser"}', method: 'POST' }
    );
  });
});
