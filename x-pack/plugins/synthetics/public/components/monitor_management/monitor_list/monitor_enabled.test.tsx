/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigKey, DataStream, SyntheticsMonitor } from '../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import { FETCH_STATUS } from '@kbn/observability-plugin/public';
import { spyOnUseFetcher } from '../../../lib/helper/spy_use_fetcher';
import { MonitorEnabled } from './monitor_enabled';

describe('<MonitorEnabled />', () => {
  const onUpdate = jest.fn();
  const testMonitor = {
    [ConfigKey.MONITOR_TYPE]: DataStream.HTTP,
    [ConfigKey.ENABLED]: true,
  } as unknown as SyntheticsMonitor;

  const assertMonitorEnabled = (button: HTMLButtonElement) =>
    expect(button).toHaveAttribute('aria-checked', 'true');
  const assertMonitorDisabled = (button: HTMLButtonElement) =>
    expect(button).toHaveAttribute('aria-checked', 'false');

  let useFetcher: jest.SpyInstance;

  beforeEach(() => {
    useFetcher?.mockClear();
    useFetcher = spyOnUseFetcher({});
  });

  it('correctly renders "enabled" state', () => {
    render(<MonitorEnabled id="test-id" monitor={testMonitor} onUpdate={onUpdate} />);

    const switchButton = screen.getByRole('switch') as HTMLButtonElement;
    assertMonitorEnabled(switchButton);
  });

  it('correctly renders "disabled" state', () => {
    render(
      <MonitorEnabled
        id="test-id"
        monitor={{ ...testMonitor, [ConfigKey.ENABLED]: false }}
        onUpdate={onUpdate}
      />
    );

    const switchButton = screen.getByRole('switch') as HTMLButtonElement;
    assertMonitorDisabled(switchButton);
  });

  it('toggles on click', () => {
    render(<MonitorEnabled id="test-id" monitor={testMonitor} onUpdate={onUpdate} />);

    const switchButton = screen.getByRole('switch') as HTMLButtonElement;
    userEvent.click(switchButton);
    assertMonitorDisabled(switchButton);
    userEvent.click(switchButton);
    assertMonitorEnabled(switchButton);
  });

  it('is disabled while request is in progress', () => {
    useFetcher.mockReturnValue({
      data: {},
      status: FETCH_STATUS.LOADING,
      refetch: () => {},
    });

    render(<MonitorEnabled id="test-id" monitor={testMonitor} onUpdate={onUpdate} />);
    const switchButton = screen.getByRole('switch') as HTMLButtonElement;
    userEvent.click(switchButton);

    expect(switchButton).toHaveAttribute('disabled');
  });
});
