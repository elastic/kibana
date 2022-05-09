/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { AlertsTable } from './alerts_table';
import { AlertsData, AlertsField } from '../../../types';
import { PLUGIN_ID } from '../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('@kbn/data-plugin/public');
jest.mock('../../../common/lib/kibana');

const columns = [
  {
    id: 'kibana.alert.rule.name',
    displayAsText: 'Name',
  },
  {
    id: 'kibana.alert.rule.category',
    displayAsText: 'Category',
  },
];

const hookUseKibanaMock = useKibana as jest.Mock;
const alertsTableConfigurationRegistryMock =
  hookUseKibanaMock().services.alertsTableConfigurationRegistry;
alertsTableConfigurationRegistryMock.has.mockImplementation((plugin: string) => {
  return plugin === PLUGIN_ID;
});
alertsTableConfigurationRegistryMock.get.mockImplementation((plugin: string) => {
  if (plugin === PLUGIN_ID) {
    return { columns };
  }
  return {};
});

describe('AlertsTable', () => {
  const consumers = [
    AlertConsumers.APM,
    AlertConsumers.LOGS,
    AlertConsumers.UPTIME,
    AlertConsumers.INFRASTRUCTURE,
    AlertConsumers.SIEM,
  ];

  const alerts: AlertsData[] = [
    {
      [AlertsField.name]: ['one'],
      [AlertsField.reason]: ['two'],
    },
    {
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
    },
  ];

  const fetchAlertsData = {
    activePage: 0,
    alerts,
    alertsCount: alerts.length,
    isInitializing: false,
    isLoading: false,
    getInspectQuery: jest.fn().mockImplementation(() => ({ request: {}, response: {} })),
    onColumnsChange: jest.fn(),
    onPageChange: jest.fn(),
    onSortChange: jest.fn(),
    refresh: jest.fn(),
  };

  const useFetchAlertsData = () => {
    return fetchAlertsData;
  };

  const tableProps = {
    configurationId: PLUGIN_ID,
    consumers,
    bulkActions: [],
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 1,
    pageSizeOptions: [1, 10, 20, 50, 100],
    leadingControlColumns: [],
    renderCellValue: jest.fn().mockImplementation((props) => {
      return `${props.colIndex}:${props.rowIndex}`;
    }),
    showCheckboxes: false,
    trailingControlColumns: [],
    alerts,
    useFetchAlertsData,
    'data-test-subj': 'testTable',
  };

  beforeEach(() => {
    alertsTableConfigurationRegistryMock.get.mockClear();
    alertsTableConfigurationRegistryMock.has.mockClear();
  });

  describe('Alerts table UI', () => {
    it('should support sorting', async () => {
      const renderResult = render(<AlertsTable {...tableProps} />);
      userEvent.click(renderResult.container.querySelector('.euiDataGridHeaderCell__button')!);
      userEvent.click(renderResult.getByTestId(`dataGridHeaderCellActionGroup-${columns[0].id}`));
      userEvent.click(renderResult.getByTitle('Sort A-Z'));
      expect(fetchAlertsData.onSortChange).toHaveBeenCalledWith([
        { direction: 'asc', id: 'kibana.alert.rule.name' },
      ]);
    });

    it('should support pagination', async () => {
      const renderResult = render(<AlertsTable {...tableProps} />);
      userEvent.click(renderResult.getByTestId('pagination-button-1'));
      expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });
    });

    describe('flyout', () => {
      it('should show a flyout when selecting an alert', async () => {
        const wrapper = render(
          <AlertsTable
            {...{
              ...tableProps,
              pageSize: 10,
            }}
          />
        );
        userEvent.click(wrapper.queryByTestId('expandColumnCellOpenFlyoutButton-0')!);

        const result = await wrapper.findAllByTestId('alertsFlyout');
        expect(result.length).toBe(1);

        expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('one');
        expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('two');

        // Should paginate too
        userEvent.click(wrapper.queryAllByTestId('pagination-button-next')[0]);
        expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('three');
        expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('four');

        userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
        expect(wrapper.queryByTestId('alertsFlyoutName')?.textContent).toBe('one');
        expect(wrapper.queryByTestId('alertsFlyoutReason')?.textContent).toBe('two');
      });

      it('should refetch data if flyout pagination exceeds the current page', async () => {
        const wrapper = render(<AlertsTable {...tableProps} />);

        userEvent.click(wrapper.queryByTestId('expandColumnCellOpenFlyoutButton-0')!);
        const result = await wrapper.findAllByTestId('alertsFlyout');
        expect(result.length).toBe(1);

        userEvent.click(wrapper.queryAllByTestId('pagination-button-next')[0]);
        expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });

        userEvent.click(wrapper.queryAllByTestId('pagination-button-previous')[0]);
        expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 1 });
      });
    });

    describe('leading control columns', () => {
      it('should return at least the flyout action control', async () => {
        const wrapper = render(<AlertsTable {...tableProps} />);
        expect(wrapper.getByTestId('expandColumnHeaderLabel').textContent).toBe('Actions');
      });

      it('should render other leading controls', () => {
        const customTableProps = {
          ...tableProps,
          leadingControlColumns: [
            {
              id: 'selection',
              width: 67,
              headerCellRender: () => <span data-test-subj="testHeader">Test header</span>,
              rowCellRender: () => <h2 data-test-subj="testCell">Test cell</h2>,
            },
          ],
        };
        const wrapper = render(<AlertsTable {...customTableProps} />);
        expect(wrapper.queryByTestId('testHeader')).not.toBe(null);
        expect(wrapper.queryByTestId('testCell')).not.toBe(null);
      });
    });
  });

  describe('Alerts table configuration registry', () => {
    it('should read the configuration from the registry', async () => {
      render(<AlertsTable {...tableProps} />);
      expect(alertsTableConfigurationRegistryMock.has).toHaveBeenCalledWith(PLUGIN_ID);
      expect(alertsTableConfigurationRegistryMock.get).toHaveBeenCalledWith(PLUGIN_ID);
    });

    it('should render an empty error state when the plugin id owner is not registered', async () => {
      const props = { ...tableProps, configurationId: 'none' };
      const result = render(<AlertsTable {...props} />);
      expect(result.getByTestId('alertsTableNoConfiguration')).toBeTruthy();
    });
  });
});
