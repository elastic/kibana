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
import { BurnRate } from './burn_rate';

describe('BurnRate', () => {
  it('shows error when entered burn rate exceed max burn rate', () => {
    render(<BurnRate onChange={() => {}} maxBurnRate={20} />);

    userEvent.type(screen.getByTestId('burnRate'), '1441', { delay: 0 });

    expect(screen.getByText(/cannot exceed/i)).toBeTruthy();
  });
});
