/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { SELECT_A_CHART_ARIA_LABEL, TREEMAP } from './translations';
import { ChartSelect } from '.';

describe('ChartSelect', () => {
  test('it renders the chart select button', () => {
    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={jest.fn()} />
      </TestProviders>
    );

    expect(screen.getByRole('button', { name: SELECT_A_CHART_ARIA_LABEL })).toBeInTheDocument();
  });

  test('it invokes `setAlertViewSelection` with the expected value when a chart is selected', async () => {
    const setAlertViewSelection = jest.fn();

    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    const selectButton = screen.getByRole('button', { name: SELECT_A_CHART_ARIA_LABEL });
    selectButton.click();
    await waitForEuiPopoverOpen();

    const treemapMenuItem = screen.getByRole('button', { name: TREEMAP });
    treemapMenuItem.click();

    expect(setAlertViewSelection).toBeCalledWith('treemap');
  });
});
