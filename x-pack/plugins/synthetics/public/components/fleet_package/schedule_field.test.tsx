/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import { PolicyConfigContextProvider } from './contexts';
import { IPolicyConfigContextProvider } from './contexts/policy_config_context';
import { ScheduleField } from './schedule_field';
import { ScheduleUnit } from './types';

describe('<ScheduleField/>', () => {
  const number = '1';
  const unit = ScheduleUnit.MINUTES;
  const onBlur = jest.fn();
  const WrappedComponent = ({
    allowedScheduleUnits,
  }: Omit<IPolicyConfigContextProvider, 'children'>) => {
    const [config, setConfig] = useState({
      number,
      unit,
    });

    return (
      <PolicyConfigContextProvider allowedScheduleUnits={allowedScheduleUnits}>
        <ScheduleField
          number={config.number}
          unit={config.unit}
          onChange={(value) => setConfig(value)}
          onBlur={onBlur}
        />
      </PolicyConfigContextProvider>
    );
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('shows all options by default (allowedScheduleUnits is not provided)', () => {
    const { getByText } = render(<WrappedComponent />);
    expect(getByText('Minutes')).toBeInTheDocument();
    expect(getByText('Seconds')).toBeInTheDocument();
  });

  it('shows only Minutes when allowedScheduleUnits = [ScheduleUnit.Minutes])', () => {
    const { queryByText } = render(
      <WrappedComponent allowedScheduleUnits={[ScheduleUnit.MINUTES]} />
    );
    expect(queryByText('Minutes')).toBeInTheDocument();
    expect(queryByText('Seconds')).not.toBeInTheDocument();
  });

  it('shows only Seconds when allowedScheduleUnits = [ScheduleUnit.Seconds])', () => {
    const { queryByText } = render(
      <WrappedComponent allowedScheduleUnits={[ScheduleUnit.SECONDS]} />
    );
    expect(queryByText('Minutes')).not.toBeInTheDocument();
    expect(queryByText('Seconds')).toBeInTheDocument();
  });

  it('only accepts whole number when allowedScheduleUnits = [ScheduleUnit.Minutes])', async () => {
    const { getByTestId } = render(
      <WrappedComponent allowedScheduleUnits={[ScheduleUnit.MINUTES]} />
    );
    const input = getByTestId('scheduleFieldInput') as HTMLInputElement;
    const select = getByTestId('scheduleFieldSelect') as HTMLInputElement;
    expect(input.value).toBe(number);
    expect(select.value).toBe(ScheduleUnit.MINUTES);

    userEvent.clear(input);
    userEvent.type(input, '1.5');

    // Click away to cause blur on input
    userEvent.click(select);

    await waitFor(() => {
      expect(input.value).toBe('2');
    });
  });

  it('handles schedule', () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('scheduleFieldInput') as HTMLInputElement;
    const select = getByTestId('scheduleFieldSelect') as HTMLInputElement;
    expect(input.value).toBe(number);
    expect(select.value).toBe(unit);
    expect(getByText('Minutes')).toBeInTheDocument();
  });

  it('handles on change', async () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('scheduleFieldInput') as HTMLInputElement;
    const select = getByTestId('scheduleFieldSelect') as HTMLInputElement;
    const newNumber = '2';
    const newUnit = ScheduleUnit.SECONDS;
    expect(input.value).toBe(number);
    expect(select.value).toBe(unit);

    userEvent.clear(input);
    userEvent.type(input, newNumber);

    await waitFor(() => {
      expect(input.value).toBe(newNumber);
    });

    userEvent.selectOptions(select, newUnit);

    await waitFor(() => {
      expect(select.value).toBe(newUnit);
      expect(getByText('Seconds')).toBeInTheDocument();
    });
  });

  it('calls onBlur when changed', () => {
    const { getByTestId } = render(
      <WrappedComponent allowedScheduleUnits={[ScheduleUnit.SECONDS, ScheduleUnit.MINUTES]} />
    );
    const input = getByTestId('scheduleFieldInput') as HTMLInputElement;
    const select = getByTestId('scheduleFieldSelect') as HTMLInputElement;

    userEvent.clear(input);
    userEvent.type(input, '2');

    userEvent.selectOptions(select, ScheduleUnit.MINUTES);

    userEvent.click(input);

    expect(onBlur).toHaveBeenCalledTimes(2);
  });
});
