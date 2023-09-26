/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { AlertsProgressBarPanel } from '.';
import { useSummaryChartData } from '../alerts_summary_charts_panel/use_summary_chart_data';
import { STACK_BY_ARIA_LABEL } from '../common/translations';
import type { GroupBySelection } from './types';

jest.mock('../../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../alerts_summary_charts_panel/use_summary_chart_data');
const mockUseSummaryChartData = useSummaryChartData as jest.Mock;

const options = ['host.name', 'user.name', 'source.ip', 'destination.ip'];

describe('Alert by grouping', () => {
  const defaultProps = {
    signalIndexName: 'signalIndexName',
    skip: false,
    groupBySelection: 'host.name' as GroupBySelection,
    setGroupBySelection: jest.fn(),
  };

  beforeEach(() => {
    mockUseSummaryChartData.mockReturnValue({ items: [], isLoading: false });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', async () => {
    await act(async () => {
      const { container } = render(
        <TestProviders>
          <AlertsProgressBarPanel {...defaultProps} />
        </TestProviders>
      );
      expect(
        container.querySelector('[data-test-subj="alerts-progress-bar-panel"]')
      ).toBeInTheDocument();
    });
  });

  test('render HeaderSection', async () => {
    await act(async () => {
      const { container } = render(
        <TestProviders>
          <AlertsProgressBarPanel {...defaultProps} />
        </TestProviders>
      );
      expect(container.querySelector(`[data-test-subj="header-section"]`)).toBeInTheDocument();
    });
  });

  test('renders inspect button', async () => {
    await act(async () => {
      const { container } = render(
        <TestProviders>
          <AlertsProgressBarPanel {...defaultProps} />
        </TestProviders>
      );
      expect(container.querySelector('[data-test-subj="inspect-icon-button"]')).toBeInTheDocument();
    });
  });

  describe('combo box', () => {
    const setGroupBySelection = jest.fn();

    test('renders combo box', async () => {
      await act(async () => {
        const { container } = render(
          <TestProviders>
            <AlertsProgressBarPanel {...defaultProps} />
          </TestProviders>
        );
        expect(container.querySelector('[data-test-subj="stackByComboBox"]')).toBeInTheDocument();
      });
    });

    test('combo box renders corrected options', async () => {
      await act(async () => {
        render(
          <TestProviders>
            <AlertsProgressBarPanel {...defaultProps} setGroupBySelection={setGroupBySelection} />
          </TestProviders>
        );
        const comboBox = screen.getByRole('combobox', { name: STACK_BY_ARIA_LABEL });
        if (comboBox) {
          comboBox.focus(); // display the combo box options
        }
      });
      const optionsFound = screen.getAllByRole('option').map((option) => option.textContent);
      options.forEach((option, i) => {
        expect(optionsFound[i]).toEqual(option);
      });
    });

    test('it invokes setGroupBySelection when an option is selected', async () => {
      const toBeSelected = 'user.name';
      await act(async () => {
        render(
          <TestProviders>
            <AlertsProgressBarPanel {...defaultProps} setGroupBySelection={setGroupBySelection} />
          </TestProviders>
        );
        const comboBox = screen.getByRole('combobox', { name: STACK_BY_ARIA_LABEL });
        if (comboBox) {
          comboBox.focus(); // display the combo box options
        }
      });
      const button = await screen.findByText(toBeSelected);
      fireEvent.click(button);

      expect(setGroupBySelection).toBeCalledWith(toBeSelected);
    });
  });
});
