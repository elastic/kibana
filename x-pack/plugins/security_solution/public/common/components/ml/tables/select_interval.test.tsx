/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SelectInterval } from './select_interval';

describe('SelectInterval', () => {
  it('selects the given interval', () => {
    const { getByText } = render(<SelectInterval interval={'day'} onChange={jest.fn()} />);
    expect((getByText('1 day') as HTMLOptionElement).selected).toBeTruthy();
  });

  it('calls onChange when clicked', () => {
    const onChangeCb = jest.fn();
    const { getByText, getByTestId } = render(
      <SelectInterval interval={'day'} onChange={onChangeCb} />
    );

    userEvent.selectOptions(getByTestId('selectInterval'), getByText('1 hour'));
    expect(onChangeCb).toBeCalledWith('hour');
  });
});
