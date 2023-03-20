/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SelectInterval } from './select_interval';

const mockUpdateCallback = jest.fn();
const mockUsePageUrlState = [{ display: 'Auto', val: 'auto' }, mockUpdateCallback];

jest.mock('@kbn/ml-url-state', () => ({
  usePageUrlState: () => mockUsePageUrlState,
}));

describe('SelectInterval', () => {
  test('creates correct initial selected value', () => {
    const { getByText } = render(
      <MemoryRouter>
        <SelectInterval />
      </MemoryRouter>
    );

    expect((getByText('Auto') as HTMLOptionElement).selected).toBeTruthy();
  });

  test('currently selected value is updated correctly on click', () => {
    const { getByText, getByTestId } = render(
      <MemoryRouter>
        <SelectInterval />
      </MemoryRouter>
    );

    expect((getByText('Auto') as HTMLOptionElement).selected).toBeTruthy();

    act(() => {
      userEvent.selectOptions(getByTestId('mlSelectInterval'), getByText('1 hour'));
    });

    expect(mockUpdateCallback).toBeCalledWith({ display: '1 hour', val: 'hour' });
  });
});
