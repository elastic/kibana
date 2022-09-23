/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useAlertsLocalStorage } from './alerts_local_storage';
import { RESET_GROUP_BY_FIELDS } from '../../../../common/components/chart_settings_popover/configurations/default/translations';
import { CHART_SETTINGS_POPOVER_ARIA_LABEL } from '../../../../common/components/chart_settings_popover/translations';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { TestProviders } from '../../../../common/mock';
import { ChartPanels } from '.';

jest.mock('./alerts_local_storage');

jest.mock('../../../../common/containers/sourcerer');

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
    useLocation: () => ({ pathname: '' }),
  };
});

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');

  return {
    ...original,
    useUiSetting$: () => ['0,0.[000]'],
    useKibana: () => ({
      services: {
        application: {
          navigateToUrl: jest.fn(),
        },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
        },
      },
    }),
  };
});

const defaultAlertSettings = {
  alertViewSelection: 'trend',
  countTableStackBy0: 'kibana.alert.rule.name',
  countTableStackBy1: 'host.name',
  isTreemapPanelExpanded: true,
  riskChartStackBy0: 'kibana.alert.rule.name',
  riskChartStackBy1: 'host.name',
  setAlertViewSelection: jest.fn(),
  setCountTableStackBy0: jest.fn(),
  setCountTableStackBy1: jest.fn(),
  setIsTreemapPanelExpanded: jest.fn(),
  setRiskChartStackBy0: jest.fn(),
  setRiskChartStackBy1: jest.fn(),
  setTrendChartStackBy: jest.fn(),
  trendChartStackBy: 'kibana.alert.rule.name',
};

const defaultProps = {
  addFilter: jest.fn(),
  alertsHistogramDefaultFilters: [
    {
      meta: {
        alias: null,
        negate: true,
        disabled: false,
        type: 'exists',
        key: 'kibana.alert.building_block_type',
        value: 'exists',
      },
      query: {
        exists: {
          field: 'kibana.alert.building_block_type',
        },
      },
    },
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'kibana.alert.workflow_status',
        params: {
          query: 'open',
        },
      },
      query: {
        term: {
          'kibana.alert.workflow_status': 'open',
        },
      },
    },
  ],
  isLoadingIndexPattern: false,
  query: {
    query: '',
    language: 'kuery',
  },
  runtimeMappings: {},
  signalIndexName: '.alerts-security.alerts-default',
  updateDateRangeCallback: jest.fn(),
};

const resetGroupByFields = () => {
  const menuButton = screen.getByRole('button', { name: CHART_SETTINGS_POPOVER_ARIA_LABEL });
  fireEvent.click(menuButton);

  const resetMenuItem = screen.getByRole('button', { name: RESET_GROUP_BY_FIELDS });
  fireEvent.click(resetMenuItem);
};

describe('ChartPanels', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useSourcererDataView as jest.Mock).mockReturnValue({
      indicesExist: true,
      indexPattern: {},
      browserFields: mockBrowserFields,
    });

    (useAlertsLocalStorage as jest.Mock).mockReturnValue({
      ...defaultAlertSettings,
    });
  });

  test('it renders the chart selector', async () => {
    render(
      <TestProviders>
        <ChartPanels {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('chartSelect')).toBeInTheDocument();
    });
  });

  test('it renders the trend loading spinner when data is loading and `alertViewSelection` is trend', async () => {
    render(
      <TestProviders>
        <ChartPanels {...defaultProps} isLoadingIndexPattern={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('trendLoadingSpinner')).toBeInTheDocument();
    });
  });

  test('it renders the alert histogram panel when `alertViewSelection` is trend', async () => {
    render(
      <TestProviders>
        <ChartPanels {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('alerts-histogram-panel')).toBeInTheDocument();
    });
  });

  describe(`'Reset group by fields' context menu action`, () => {
    describe('Group by', () => {
      const alertViewSelections = ['trend', 'table', 'treemap'];

      alertViewSelections.forEach((alertViewSelection) => {
        test(`it resets the 'Group by' field to the default value, even if the user has triggered validation errors, when 'alertViewSelection' is '${alertViewSelection}'`, async () => {
          (useAlertsLocalStorage as jest.Mock).mockReturnValue({
            ...defaultAlertSettings,
            alertViewSelection,
          });

          const defaultValue = 'kibana.alert.rule.name';
          const invalidValue = 'an invalid value';

          render(
            <TestProviders>
              <ChartPanels {...defaultProps} />
            </TestProviders>
          );

          const initialValue = screen.getAllByTestId('comboBoxInput')[0]; // EuiComboBox does NOT render the current selection via it's input; it uses this div
          expect(initialValue).toHaveTextContent(defaultValue);

          // update the EuiComboBox input to an invalid value:
          const searchInput = screen.getAllByTestId('comboBoxSearchInput')[0]; // the actual <input /> controlled by EuiComboBox
          fireEvent.change(searchInput, { target: { value: invalidValue } });

          const afterInvalidInput = screen.getAllByTestId('comboBoxInput')[0];
          expect(afterInvalidInput).toHaveTextContent(invalidValue); // the 'Group by' EuiComboBox is now in the "error state"

          resetGroupByFields(); // invoke the `Reset group by fields` context menu action

          await waitFor(() => {
            const afterReset = screen.getAllByTestId('comboBoxInput')[0];
            expect(afterReset).toHaveTextContent(defaultValue); // back to the default
          });
        });
      });
    });

    describe('Group by top', () => {
      const justTableAndTreemap = ['table', 'treemap'];

      justTableAndTreemap.forEach((alertViewSelection) => {
        test(`it resets the 'Group by top' field to the default value, even if the user has triggered validation errors, when 'alertViewSelection' is '${alertViewSelection}'`, async () => {
          (useAlertsLocalStorage as jest.Mock).mockReturnValue({
            ...defaultAlertSettings,
            alertViewSelection,
          });

          const defaultValue = 'host.name';
          const invalidValue = 'an-invalid-value';

          render(
            <TestProviders>
              <ChartPanels {...defaultProps} />
            </TestProviders>
          );

          const initialValue = screen.getAllByTestId('comboBoxInput')[1]; // EuiComboBox does NOT render the current selection via it's input; it uses this div
          expect(initialValue).toHaveTextContent(defaultValue);

          // update the EuiComboBox input to an invalid value:
          const searchInput = screen.getAllByTestId('comboBoxSearchInput')[1]; // the actual <input /> controlled by EuiComboBox
          fireEvent.change(searchInput, { target: { value: invalidValue } });

          const afterInvalidInput = screen.getAllByTestId('comboBoxInput')[1];
          expect(afterInvalidInput).toHaveTextContent(invalidValue); // the 'Group by top' EuiComboBox is now in the "error state"

          resetGroupByFields(); // invoke the `Reset group by fields` context menu action

          await waitFor(() => {
            const afterReset = screen.getAllByTestId('comboBoxInput')[1];
            expect(afterReset).toHaveTextContent(defaultValue); // back to the default
          });
        });
      });
    });
  });

  test('it renders the table loading spinner when data is loading and `alertViewSelection` is table', async () => {
    (useAlertsLocalStorage as jest.Mock).mockReturnValue({
      ...defaultAlertSettings,
      alertViewSelection: 'table',
    });

    render(
      <TestProviders>
        <ChartPanels {...defaultProps} isLoadingIndexPattern={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tableLoadingSpinner')).toBeInTheDocument();
    });
  });

  test('it renders the alerts count panel when `alertViewSelection` is table', async () => {
    (useAlertsLocalStorage as jest.Mock).mockReturnValue({
      ...defaultAlertSettings,
      alertViewSelection: 'table',
    });

    render(
      <TestProviders>
        <ChartPanels {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('alertsCountPanel')).toBeInTheDocument();
    });
  });

  test('it renders the treemap loading spinner when data is loading and `alertViewSelection` is treemap', async () => {
    (useAlertsLocalStorage as jest.Mock).mockReturnValue({
      ...defaultAlertSettings,
      alertViewSelection: 'treemap',
    });

    render(
      <TestProviders>
        <ChartPanels {...defaultProps} isLoadingIndexPattern={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('treemapLoadingSpinner')).toBeInTheDocument();
    });
  });

  test('it renders the alerts count panel when `alertViewSelection` is treemap', async () => {
    (useAlertsLocalStorage as jest.Mock).mockReturnValue({
      ...defaultAlertSettings,
      alertViewSelection: 'treemap',
    });

    render(
      <TestProviders>
        <ChartPanels {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('treemapPanel')).toBeInTheDocument();
    });
  });
});
