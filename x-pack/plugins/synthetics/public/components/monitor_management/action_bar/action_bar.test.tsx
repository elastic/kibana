/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import * as fetchers from '../../../state/api/monitor_management';
import {
  DataStream,
  HTTPFields,
  ScheduleUnit,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import { ActionBar } from './action_bar';

describe('<ActionBar />', () => {
  const setMonitor = jest.spyOn(fetchers, 'setMonitor');
  const monitor: SyntheticsMonitor = {
    name: 'test-monitor',
    schedule: {
      unit: ScheduleUnit.MINUTES,
      number: '2',
    },
    urls: 'https://elastic.co',
    type: DataStream.HTTP,
  } as unknown as HTTPFields;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only calls setMonitor when valid and after submission', () => {
    render(<ActionBar monitor={monitor} isTestRunInProgress={false} isValid={true} />);

    act(() => {
      userEvent.click(screen.getByText('Save monitor'));
    });

    expect(setMonitor).toBeCalledWith({ monitor, id: undefined });
  });

  it('does not call setMonitor until submission', () => {
    render(<ActionBar monitor={monitor} isTestRunInProgress={false} isValid={true} />);

    expect(setMonitor).not.toBeCalled();

    act(() => {
      userEvent.click(screen.getByText('Save monitor'));
    });

    expect(setMonitor).toBeCalledWith({ monitor, id: undefined });
  });

  it('does not call setMonitor if invalid', () => {
    render(<ActionBar monitor={monitor} isTestRunInProgress={false} isValid={false} />);

    expect(setMonitor).not.toBeCalled();

    act(() => {
      userEvent.click(screen.getByText('Save monitor'));
    });

    expect(setMonitor).not.toBeCalled();
  });

  it('disables button and displays help text when form is invalid after first submission', async () => {
    render(<ActionBar monitor={monitor} isTestRunInProgress={false} isValid={false} />);

    expect(
      screen.queryByText('Your monitor has errors. Please fix them before saving.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Save monitor')).not.toBeDisabled();

    act(() => {
      userEvent.click(screen.getByText('Save monitor'));
    });

    await waitFor(() => {
      expect(
        screen.getByText('Your monitor has errors. Please fix them before saving.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save monitor' })).toBeDisabled();
    });
  });

  it('calls option onSave when saving monitor', () => {
    const onSave = jest.fn();
    render(
      <ActionBar monitor={monitor} isTestRunInProgress={false} isValid={false} onSave={onSave} />
    );

    act(() => {
      userEvent.click(screen.getByText('Save monitor'));
    });

    expect(onSave).toBeCalled();
  });
});
