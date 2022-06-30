/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';

import { AlertsTable } from './alerts_table';
import { ActionButtonIcon, AlertsField, AlertsTableFlyoutState } from '../../../types';

jest.mock('@kbn/data-plugin/public');

const columns = [
  {
    id: AlertsField.name,
    displayAsText: 'Name',
  },
  {
    id: AlertsField.reason,
    displayAsText: 'Reason',
  },
];

describe('AlertsTable', () => {
  const alerts = [
    {
      [AlertsField.name]: ['one'],
      [AlertsField.reason]: ['two'],
    },
    {
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
    },
  ] as unknown as EcsFieldsResponse[];

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
    sort: [],
  };

  const useFetchAlertsData = () => {
    return fetchAlertsData;
  };

  const alertsTableConfiguration = {
    id: '',
    columns,
    sort: [],
    externalFlyout: {
      header: jest.fn(),
      body: jest.fn(),
      footer: jest.fn(),
    },
    internalFlyout: {
      header: jest.fn(),
      body: jest.fn(),
      footer: jest.fn(),
    },
    getRenderCellValue: () =>
      jest.fn().mockImplementation((props) => {
        return `${props.colIndex}:${props.rowIndex}`;
      }),
  };

  const tableProps = {
    alertsTableConfiguration,
    columns,
    bulkActions: [],
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 1,
    pageSizeOptions: [1, 10, 20, 50, 100],
    leadingControlColumns: [],
    showCheckboxes: false,
    showExpandToDetails: true,
    trailingControlColumns: [],
    alerts,
    flyoutState: AlertsTableFlyoutState.internal,
    useFetchAlertsData,
    visibleColumns: columns.map((c) => c.id),
    'data-test-subj': 'testTable',
  };

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

    describe('actions column', () => {
      it('should load actions set in config', () => {
        const customTableProps = {
          ...tableProps,
          alertsTableConfiguration: {
            ...alertsTableConfiguration,
            useActionsColumn: () => {
              return {
                getActionButtonIconsProps: () => [
                  {
                    iconType: 'analyzeEvent',
                    color: 'primary',
                    onClick: () => {},
                    'data-test-subj': 'testActionColumn',
                  } as ActionButtonIcon,
                  {
                    iconType: 'invert',
                    color: 'primary',
                    onClick: () => {},
                    'data-test-subj': 'testActionColumn2',
                  } as ActionButtonIcon,
                ],
              };
            },
          },
        };

        const { queryByTestId } = render(<AlertsTable {...customTableProps} />);
        expect(queryByTestId('testActionColumn')).not.toBe(null);
        expect(queryByTestId('testActionColumn2')).not.toBe(null);
        expect(queryByTestId('expandColumnCellOpenFlyoutButton-0')).not.toBe(null);
      });

      it('should not add expansion action when not set', () => {
        const customTableProps = {
          ...tableProps,
          showExpandToDetails: false,
          alertsTableConfiguration: {
            ...alertsTableConfiguration,
            useActionsColumn: () => {
              return {
                getActionButtonIconsProps: () => [
                  {
                    iconType: 'analyzeEvent',
                    color: 'primary',
                    onClick: () => {},
                    'data-test-subj': 'testActionColumn',
                  } as ActionButtonIcon,
                  {
                    iconType: 'invert',
                    color: 'primary',
                    onClick: () => {},
                    'data-test-subj': 'testActionColumn2',
                  } as ActionButtonIcon,
                ],
              };
            },
          },
        };

        const { queryByTestId } = render(<AlertsTable {...customTableProps} />);
        expect(queryByTestId('testActionColumn')).not.toBe(null);
        expect(queryByTestId('testActionColumn2')).not.toBe(null);
        expect(queryByTestId('expandColumnCellOpenFlyoutButton-0')).toBe(null);
      });

      it('should render no action column if there is neither the action nor the expand action config is set', () => {
        const customTableProps = {
          ...tableProps,
          showExpandToDetails: false,
        };

        const { queryByTestId } = render(<AlertsTable {...customTableProps} />);
        expect(queryByTestId('expandColumnHeaderLabel')).toBe(null);
        expect(queryByTestId('expandColumnCellOpenFlyoutButton')).toBe(null);
      });
    });
  });
});
