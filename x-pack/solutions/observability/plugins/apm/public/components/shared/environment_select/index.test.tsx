/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { EnvironmentSelect } from '.';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const DEFAULT_ENVIRONMENT = 'production';

const mockOnSearchChange = jest.fn();
jest.mock('./use_environment_select', () => ({
  useEnvironmentSelect: jest.fn(() => ({
    data: { terms: [] },
    searchStatus: 'success',
    onSearchChange: mockOnSearchChange,
  })),
}));

describe('EnvironmentSelect', () => {
  async function clearInputValue(input: HTMLInputElement) {
    input.setSelectionRange(0, input.value.length);
    await act(async () =>
      userEvent.type(input, '{backspace}', {
        initialSelectionEnd: 0,
      })
    );
    fireEvent.input(input, { target: { value: '' } });
  }

  const defaultProps = {
    environment: DEFAULT_ENVIRONMENT,
    availableEnvironments: ['production', 'staging', 'development'],
    status: FETCH_STATUS.SUCCESS,
    serviceName: 'test-service',
    rangeFrom: 'now-15m',
    rangeTo: 'now',
    onChange: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it('resets to the current environment on blur if no valid selection is made', async () => {
    const { getByRole } = render(<EnvironmentSelect {...defaultProps} />);
    const combobox = getByRole('combobox') as HTMLInputElement;

    await clearInputValue(combobox);

    expect(combobox).toHaveValue('');

    act(() => {
      fireEvent.blur(combobox);
    });

    expect(combobox).toHaveValue('production');
  });

  it('Should not call onSearchChange if item is already listed', async () => {
    const { getByRole } = render(<EnvironmentSelect {...defaultProps} />, {
      // TODO: fails with concurrent mode
      legacyRoot: true,
    });
    const combobox = getByRole('combobox') as HTMLInputElement;

    expect(mockOnSearchChange.mock.calls.length).toBe(0);

    await clearInputValue(combobox);

    expect(combobox).toHaveValue('');

    expect(mockOnSearchChange.mock.calls.length).toBe(1);

    act(() => {
      fireEvent.input(combobox, { target: { value: 'dev' } });
    });

    expect(combobox).toHaveValue('dev');
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(mockOnSearchChange.mock.calls.length).toBe(1);
  });
});
