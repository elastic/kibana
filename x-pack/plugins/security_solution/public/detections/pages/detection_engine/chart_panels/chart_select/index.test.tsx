/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { ChartSelect } from '.';

describe('ChartSelect', () => {
  test('it renders the chart select button', () => {
    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={jest.fn()} />
      </TestProviders>
    );

    expect(screen.getByTestId('chartSelect')).toBeInTheDocument();
  });

  test('it invokes `setAlertViewSelection` with the expected value when a chart is selected', () => {
    const setAlertViewSelection = jest.fn();

    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    const selectButton = screen.getByTestId('chartSelect');
    selectButton.click();

    const treemapMenuItem = screen.getByTestId('treemap');
    treemapMenuItem.click();

    expect(setAlertViewSelection).toBeCalledWith('treemap');
  });
});
