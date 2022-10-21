/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { render, screen, within } from '@testing-library/react';
import { ExceptionsTableUtilityBar } from './exceptions_table_utility_bar';

describe('ExceptionsTableUtilityBar', () => {
  it('displays correct exception lists label and refresh rules action button', () => {
    const EXCEPTION_LISTS_NUMBER = 25;
    render(
      <TestProviders>
        <ExceptionsTableUtilityBar
          onRefresh={jest.fn()}
          totalExceptionLists={EXCEPTION_LISTS_NUMBER}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('showingExceptionLists')).toBeInTheDocument();
    expect(screen.getByTestId('refreshRulesAction')).toBeInTheDocument();
    expect(screen.getByText(`Showing ${EXCEPTION_LISTS_NUMBER} lists`)).toBeInTheDocument();
  });

  it('invokes refresh on refresh action click', () => {
    const mockRefresh = jest.fn();
    render(
      <TestProviders>
        <ExceptionsTableUtilityBar onRefresh={mockRefresh} totalExceptionLists={1} />
      </TestProviders>
    );

    const buttonWrapper = screen.getByTestId('refreshRulesAction');
    within(buttonWrapper).getByRole('button').click();

    expect(mockRefresh).toHaveBeenCalled();
  });
});
