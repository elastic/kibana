/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import * as fetchers from '../../../state/api/monitor_management';
import { DataStream, ScheduleUnit } from '../../fleet_package/types';
import { ActionBar } from './action_bar';

describe('<ActionBar />', () => {
  const setMonitor = jest.spyOn(fetchers, 'setMonitor');
  const monitor = {
    name: 'test-monitor',
    schedule: {
      unit: ScheduleUnit.MINUTES,
      number: '2',
    },
    urls: 'https://elastic.co',
    type: DataStream.BROWSER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only calls setMonitor when valid and after submission', () => {
    const id = 'test-id';
    render(<ActionBar monitor={monitor} id={id} isValid={true} />);

    userEvent.click(screen.getByText('Edit monitor'));

    expect(setMonitor).toBeCalledWith({ monitor, id });
  });

  it('does not call setMonitor until submission', () => {
    const id = 'test-id';
    render(<ActionBar monitor={monitor} id={id} isValid={true} />);

    expect(setMonitor).not.toBeCalled();

    userEvent.click(screen.getByText('Edit monitor'));

    expect(setMonitor).toBeCalledWith({ monitor, id });
  });

  it('does not call setMonitor if invalid', () => {
    const id = 'test-id';
    render(<ActionBar monitor={monitor} id={id} isValid={false} />);

    expect(setMonitor).not.toBeCalled();

    userEvent.click(screen.getByText('Edit monitor'));

    expect(setMonitor).not.toBeCalled();
  });

  it.each([
    ['', 'Save monitor'],
    ['test-id', 'Edit monitor'],
  ])('displays right call to action', (id, callToAction) => {
    render(<ActionBar monitor={monitor} id={id} isValid={true} />);

    expect(screen.getByText(callToAction)).toBeInTheDocument();
  });

  it('disables button and displays help text when form is invalid after first submission', async () => {
    render(<ActionBar monitor={monitor} isValid={false} />);

    expect(
      screen.queryByText('Your monitor has errors. Please fix them before saving.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Save monitor')).not.toBeDisabled();

    userEvent.click(screen.getByText('Save monitor'));

    await waitFor(() => {
      expect(
        screen.getByText('Your monitor has errors. Please fix them before saving.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save monitor' })).toBeDisabled();
    });
  });

  it('calls option onSave when saving monitor', () => {
    const onSave = jest.fn();
    render(<ActionBar monitor={monitor} isValid={false} onSave={onSave} />);

    userEvent.click(screen.getByText('Save monitor'));

    expect(onSave).toBeCalled();
  });
});
