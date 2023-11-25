/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { ActionColumn } from './action_column';
import { alertDataMock } from '../mocks';

describe('ActionColumn', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ActionColumn alert={alertDataMock} />
      </TestProviders>
    );

    expect(getByTestId('risk-inputs-actions')).toBeInTheDocument();
  });

  it('toggles the popover when button is clicked', () => {
    const { getByRole } = render(
      <TestProviders>
        <ActionColumn alert={alertDataMock} />
      </TestProviders>
    );

    fireEvent.click(getByRole('button'));

    expect(getByRole('dialog')).toBeInTheDocument();
  });
});
