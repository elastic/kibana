/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../lib/helper/rtl_helpers';
import { ScheduleField } from './schedule_field';
import { ScheduleUnit } from './types';

describe('<ScheduleField/>', () => {
  const number = '1';
  const unit = ScheduleUnit.MINUTES;
  const WrappedComponent = () => {
    const [config, setConfig] = useState({
      number,
      unit,
    });

    return (
      <ScheduleField
        number={config.number}
        unit={config.unit}
        onChange={(value) => setConfig(value)}
      />
    );
  };

  it('hanles schedule', () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('scheduleFieldInput') as HTMLInputElement;
    const select = getByTestId('scheduleFieldSelect') as HTMLInputElement;
    expect(input.value).toBe(number);
    expect(select.value).toBe(unit);
    expect(getByText('Minutes')).toBeInTheDocument();
  });

  it('hanles on change', async () => {
    const { getByText, getByTestId } = render(<WrappedComponent />);
    const input = getByTestId('scheduleFieldInput') as HTMLInputElement;
    const select = getByTestId('scheduleFieldSelect') as HTMLInputElement;
    const newNumber = '2';
    const newUnit = ScheduleUnit.SECONDS;
    expect(input.value).toBe(number);
    expect(select.value).toBe(unit);

    fireEvent.change(input, { target: { value: newNumber } });

    await waitFor(() => {
      expect(input.value).toBe(newNumber);
    });

    fireEvent.change(select, { target: { value: newUnit } });

    await waitFor(() => {
      expect(select.value).toBe(newUnit);
      expect(getByText('Seconds')).toBeInTheDocument();
    });
  });
});
