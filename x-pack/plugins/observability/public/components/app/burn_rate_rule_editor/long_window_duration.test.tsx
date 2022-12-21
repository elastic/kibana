/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { render } from '../../../utils/test_helper';
import { LongWindowDuration } from './long_window_duration';

describe('LongWindowDuration', () => {
  it('shows error when duration is greater than 1440minutes', () => {
    render(<LongWindowDuration onChange={() => {}} />);

    userEvent.selectOptions(screen.getByTestId('durationUnitSelect'), 'm');
    userEvent.clear(screen.getByTestId('durationValueInput'));
    userEvent.type(screen.getByTestId('durationValueInput'), '1441', { delay: 0 });

    expect(screen.getByText(/cannot exceed/i)).toBeTruthy();
  });

  it('shows error when duration is greater than 24 hours', () => {
    render(<LongWindowDuration onChange={() => {}} />);

    userEvent.selectOptions(screen.getByTestId('durationUnitSelect'), 'h');
    userEvent.clear(screen.getByTestId('durationValueInput'));
    userEvent.type(screen.getByTestId('durationValueInput'), '25', { delay: 0 });

    expect(screen.getByText(/cannot exceed/i)).toBeTruthy();
  });

  it('shows error when duration is lower than 30 minutes', async () => {
    render(<LongWindowDuration onChange={() => {}} />);

    userEvent.selectOptions(screen.getByTestId('durationUnitSelect'), ['m']);
    userEvent.clear(screen.getByTestId('durationValueInput'));
    userEvent.type(screen.getByTestId('durationValueInput'), '29');

    expect(screen.getByText(/cannot exceed/i)).toBeTruthy();
  });
});
