/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useReducer } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import { ALERT_RULE_NAME, ALERT_REASON, ALERT_FLAPPING, ALERT_STATUS } from '@kbn/rule-data-utils';
import { AlertsTable } from './alerts_table';
import { AlertsTableProps, BulkActionsState, RowSelectionState } from '../../../types';
import { EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { BulkActionsContext } from './bulk_actions/context';
import { bulkActionsReducer } from './bulk_actions/reducer';

jest.mock('@kbn/data-plugin/public');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));

const columns = [
  {
    id: ALERT_RULE_NAME,
    displayAsText: 'Name',
  },
  {
    id: ALERT_REASON,
    displayAsText: 'Reason',
  },
  {
    id: ALERT_STATUS,
    displayAsText: 'Alert status',
  },
];

const alerts = [
  {
    [ALERT_RULE_NAME]: ['one'],
    [ALERT_REASON]: ['two'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [true],
  },
  {
    [ALERT_RULE_NAME]: ['three'],
    [ALERT_REASON]: ['four'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [false],
  },
  {
    [ALERT_RULE_NAME]: ['five'],
    [ALERT_REASON]: ['six'],
    [ALERT_STATUS]: ['recovered'],
    [ALERT_FLAPPING]: [true],
  },
  {
    [ALERT_RULE_NAME]: ['seven'],
    [ALERT_REASON]: ['eight'],
    [ALERT_STATUS]: ['recovered'],
    [ALERT_FLAPPING]: [false],
  },
] as unknown as EcsFieldsResponse[];

describe('AlertsTable', () => {
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
    casesFeatureId: '',
    columns,
    sort: [],
    useInternalFlyout: jest.fn().mockImplementation(() => ({
      header: jest.fn(),
      body: jest.fn(),
      footer: jest.fn(),
    })),
    getRenderCellValue: () =>
      jest.fn().mockImplementation((props) => {
        return `${props.colIndex}:${props.rowIndex}`;
      }),
    useBulkActions: () => [
      {
        label: 'Fake Bulk Action',
        key: 'fakeBulkAction',
        'data-test-subj': 'fake-bulk-action',
        disableOnQuery: false,
        onClick: () => {},
      },
    ],
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
    showExpandToDetails: true,
    trailingControlColumns: [],
    alerts,
    useFetchAlertsData,
    visibleColumns: columns.map((c) => c.id),
    'data-test-subj': 'testTable',
    updatedAt: Date.now(),
    onToggleColumn: () => {},
    onResetColumns: () => {},
    onColumnsChange: () => {},
    onChangeVisibleColumns: () => {},
    browserFields: {},
  };

  const defaultBulkActionsState = {
    rowSelection: new Map<number, RowSelectionState>(),
    isAllSelected: false,
    areAllVisibleRowsSelected: false,
    rowCount: 2,
  };

  const AlertsTableWithLocale: React.FunctionComponent<
    AlertsTableProps & { initialBulkActionsState?: BulkActionsState }
  > = (props) => {
    const initialBulkActionsState = useReducer(
      bulkActionsReducer,
      props.initialBulkActionsState || defaultBulkActionsState
    );

    return (
      <IntlProvider locale="en">
        <BulkActionsContext.Provider value={initialBulkActionsState}>
          <AlertsTable {...props} />
        </BulkActionsContext.Provider>
      </IntlProvider>
    );
  };

  describe('Alerts table UI', () => {
    it('should support sorting', async () => {
      const renderResult = render(<AlertsTableWithLocale {...tableProps} />);
      userEvent.click(renderResult.container.querySelector('.euiDataGridHeaderCell__button')!);
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId(`dataGridHeaderCellActionGroup-${columns[0].id}`));
      userEvent.click(renderResult.getByTitle('Sort A-Z'));
      expect(fetchAlertsData.onSortChange).toHaveBeenCalledWith([
        { direction: 'asc', id: 'kibana.alert.rule.name' },
      ]);
    });

    it('should support pagination', async () => {
      const renderResult = render(<AlertsTableWithLocale {...tableProps} />);
      userEvent.click(renderResult.getByTestId('pagination-button-1'));
      expect(fetchAlertsData.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });
    });

    it('should show when it was updated', () => {
      const { getByTestId } = render(<AlertsTableWithLocale {...tableProps} />);
      expect(getByTestId('toolbar-updated-at')).not.toBe(null);
    });

    it('should show alerts count', () => {
      const { getByTestId } = render(<AlertsTableWithLocale {...tableProps} />);
      expect(getByTestId('toolbar-alerts-count')).not.toBe(null);
    });

    it('should show alert status', () => {
      const props = {
        ...tableProps,
        showAlertStatusWithFlapping: true,
        pageSize: alerts.length,
        alertsTableConfiguration: {
          ...alertsTableConfiguration,
          getRenderCellValue: undefined,
        },
      };

      const { queryAllByTestId } = render(<AlertsTableWithLocale {...props} />);
      expect(queryAllByTestId('alertLifecycleStatusBadge')[0].textContent).toEqual('Flapping');
      expect(queryAllByTestId('alertLifecycleStatusBadge')[1].textContent).toEqual('Active');
      expect(queryAllByTestId('alertLifecycleStatusBadge')[2].textContent).toEqual('Recovered');
      expect(queryAllByTestId('alertLifecycleStatusBadge')[3].textContent).toEqual('Recovered');
    });

    describe('leading control columns', () => {
      it('should return at least the flyout action control', async () => {
        const wrapper = render(<AlertsTableWithLocale {...tableProps} />);
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
        const wrapper = render(<AlertsTableWithLocale {...customTableProps} />);
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
                renderCustomActionsRow: () => {
                  return (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="analyzeEvent"
                          color="primary"
                          onClick={() => {}}
                          size="s"
                          data-test-subj="testActionColumn"
                          aria-label="testActionLabel"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="analyzeEvent"
                          color="primary"
                          onClick={() => {}}
                          size="s"
                          data-test-subj="testActionColumn2"
                          aria-label="testActionLabel2"
                        />
                      </EuiFlexItem>
                    </>
                  );
                },
              };
            },
          },
        };

        const { queryByTestId } = render(<AlertsTableWithLocale {...customTableProps} />);
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
                renderCustomActionsRow: () => {
                  return (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="analyzeEvent"
                          color="primary"
                          onClick={() => {}}
                          size="s"
                          data-test-subj="testActionColumn"
                          aria-label="testActionLabel"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="analyzeEvent"
                          color="primary"
                          onClick={() => {}}
                          size="s"
                          data-test-subj="testActionColumn2"
                          aria-label="testActionLabel2"
                        />
                      </EuiFlexItem>
                    </>
                  );
                },
              };
            },
          },
        };

        const { queryByTestId } = render(<AlertsTableWithLocale {...customTableProps} />);
        expect(queryByTestId('testActionColumn')).not.toBe(null);
        expect(queryByTestId('testActionColumn2')).not.toBe(null);
        expect(queryByTestId('expandColumnCellOpenFlyoutButton-0')).toBe(null);
      });

      it('should render no action column if there is neither the action nor the expand action config is set', () => {
        const customTableProps = {
          ...tableProps,
          showExpandToDetails: false,
        };

        const { queryByTestId } = render(<AlertsTableWithLocale {...customTableProps} />);
        expect(queryByTestId('expandColumnHeaderLabel')).toBe(null);
        expect(queryByTestId('expandColumnCellOpenFlyoutButton')).toBe(null);
      });

      describe('row loading state on action', () => {
        let mockedFn: jest.Mock;
        let customTableProps: AlertsTableProps;

        beforeEach(() => {
          mockedFn = jest.fn();
          customTableProps = {
            ...tableProps,
            pageSize: 2,
            alertsTableConfiguration: {
              ...alertsTableConfiguration,
              useActionsColumn: () => {
                return {
                  renderCustomActionsRow: mockedFn.mockReturnValue(
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="analyzeEvent"
                          color="primary"
                          onClick={() => {}}
                          size="s"
                          data-test-subj="testActionColumn"
                          aria-label="testActionLabel"
                        />
                      </EuiFlexItem>
                    </>
                  ),
                };
              },
            },
          };
        });

        it('should show the row loader when callback triggered', async () => {
          render(<AlertsTableWithLocale {...customTableProps} />);
          fireEvent.click((await screen.findAllByTestId('testActionColumn'))[0]);

          // the callback given to our clients to run when they want to update the loading state
          mockedFn.mock.calls[0][0].setIsActionLoading(true);

          expect(await screen.findAllByTestId('row-loader')).toHaveLength(1);
          const selectedOptions = await screen.findAllByTestId('dataGridRowCell');

          // first row, first column
          expect(within(selectedOptions[0]).getByLabelText('Loading')).toBeDefined();
          expect(within(selectedOptions[0]).queryByRole('checkbox')).not.toBeInTheDocument();

          // second row, first column
          expect(within(selectedOptions[5]).queryByLabelText('Loading')).not.toBeInTheDocument();
          expect(within(selectedOptions[5]).getByRole('checkbox')).toBeDefined();
        });

        it('should show the row loader when callback triggered with false', async () => {
          const initialBulkActionsState = {
            ...defaultBulkActionsState,
            rowSelection: new Map([[0, { isLoading: true }]]),
          };

          render(
            <AlertsTableWithLocale
              {...customTableProps}
              initialBulkActionsState={initialBulkActionsState}
            />
          );
          fireEvent.click((await screen.findAllByTestId('testActionColumn'))[0]);

          // the callback given to our clients to run when they want to update the loading state
          mockedFn.mock.calls[0][0].setIsActionLoading(false);

          expect(screen.queryByTestId('row-loader')).not.toBeInTheDocument();
        });
      });
    });
  });
});
