/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import * as i18n from './translations';
import { ChartSelect } from '.';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
jest.mock('../../../../../common/hooks/use_experimental_features');

describe('ChartSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the chart select button when alertsPageChartsEnabled is false', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={jest.fn()} />
      </TestProviders>
    );

    expect(
      screen.getByRole('button', { name: i18n.SELECT_A_CHART_ARIA_LABEL })
    ).toBeInTheDocument();
  });

  test('it invokes `setAlertViewSelection` with the expected value when a chart is selected and alertsPageChartsEnabled is false', async () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    const setAlertViewSelection = jest.fn();
    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    const selectButton = screen.getByRole('button', { name: i18n.SELECT_A_CHART_ARIA_LABEL });
    selectButton.click();
    await waitForEuiPopoverOpen();

    const treemapMenuItem = screen.getByRole('button', { name: i18n.TREEMAP });
    treemapMenuItem.click();

    expect(setAlertViewSelection).toBeCalledWith('treemap');
  });

  test('it renders the chart select tabs when alertsPageChartsEnabled is true', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={jest.fn()} />
      </TestProviders>
    );

    expect(screen.getByTestId('chart-select-tabs')).toBeInTheDocument();
    expect(screen.getByTitle('Trend')).toHaveAttribute('aria-pressed', 'true');
  });

  test('changing selection render correctly when alertsPageChartsEnabled is true', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    const setAlertViewSelection = jest.fn();
    const { rerender } = render(
      <TestProviders>
        <ChartSelect alertViewSelection="trend" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    expect(screen.getByTitle('Trend')).toHaveAttribute('aria-pressed', 'true');

    const treemapButton = screen.getByTitle('Treemap');
    expect(treemapButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(treemapButton);
    expect(setAlertViewSelection).toHaveBeenCalledWith('treemap');

    rerender(
      <TestProviders>
        <ChartSelect alertViewSelection="treemap" setAlertViewSelection={setAlertViewSelection} />
      </TestProviders>
    );

    expect(screen.getByTitle('Treemap')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTitle('Trend')).toHaveAttribute('aria-pressed', 'false');
  });
});
