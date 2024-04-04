/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useReducer } from 'react';

import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import {
  ALERT_RULE_NAME,
  ALERT_REASON,
  ALERT_FLAPPING,
  ALERT_STATUS,
  ALERT_CASE_IDS,
} from '@kbn/rule-data-utils';
import { AlertsTable } from './alerts_table';
import {
  AlertsField,
  AlertsTableConfigurationRegistry,
  AlertsTableProps,
  BulkActionsState,
  FetchAlertData,
  RowSelectionState,
  UseCellActions,
  Alerts,
} from '../../../types';
import { EuiButton, EuiButtonIcon, EuiDataGridColumnCellAction, EuiFlexItem } from '@elastic/eui';
import { bulkActionsReducer } from './bulk_actions/reducer';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { getCasesMockMap } from './cases/index.mock';
import { getMaintenanceWindowMockMap } from './maintenance_windows/index.mock';
import { createAppMockRenderer, getJsDomPerformanceFix } from '../test_utils';
import { createCasesServiceMock } from './index.mock';
import { useCaseViewNavigation } from './cases/use_case_view_navigation';
import { act } from 'react-dom/test-utils';
import { AlertsTableContext, AlertsTableQueryContext } from './contexts/alerts_table_context';

const mockCaseService = createCasesServiceMock();

jest.mock('@kbn/data-plugin/public');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    useKibana: () => ({
      services: {
        cases: mockCaseService,
        notifications: {
          toasts: {
            addDanger: jest.fn(),
            addSuccess: jest.fn(),
          },
        },
      },
    }),
  };
});

jest.mock('./cases/use_case_view_navigation');

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
  {
    id: ALERT_CASE_IDS,
    displayAsText: 'Cases',
  },
];

const alerts = [
  {
    [ALERT_RULE_NAME]: ['one'],
    [ALERT_REASON]: ['two'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [true],
    [ALERT_CASE_IDS]: ['test-id'],
  },
  {
    [ALERT_RULE_NAME]: ['three'],
    [ALERT_REASON]: ['four'],
    [ALERT_STATUS]: ['active'],
    [ALERT_FLAPPING]: [false],
    [ALERT_CASE_IDS]: ['test-id-2'],
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
] as unknown as Alerts;

const oldAlertsData = [
  [
    {
      field: AlertsField.name,
      value: ['one'],
    },
    {
      field: AlertsField.reason,
      value: ['two'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['three'],
    },
    {
      field: AlertsField.reason,
      value: ['four'],
    },
  ],
] as FetchAlertData['oldAlertsData'];

const ecsAlertsData = [
  [
    {
      '@timestamp': ['2023-01-28T10:48:49.559Z'],
      _id: 'SomeId',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['one'],
          },
          reason: ['two'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-27T10:48:49.559Z'],
      _id: 'SomeId2',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['three'],
          },
          reason: ['four'],
        },
      },
    },
  ],
] as FetchAlertData['ecsAlertsData'];

const cellActionOnClickMockedFn = jest.fn();

const TEST_ID = {
  CELL_ACTIONS_POPOVER: 'euiDataGridExpansionPopover',
  CELL_ACTIONS_EXPAND: 'euiDataGridCellExpandButton',
  FIELD_BROWSER: 'fields-browser-container',
  FIELD_BROWSER_BTN: 'show-field-browser',
  FIELD_BROWSER_CUSTOM_CREATE_BTN: 'field-browser-custom-create-btn',
};

const mockedUseCellActions: UseCellActions = () => {
  const mockedGetCellActions = (columnId: string): EuiDataGridColumnCellAction[] => {
    const fakeCellAction: EuiDataGridColumnCellAction = ({ rowIndex, Component }) => {
      const label = 'Fake Cell First Action';
      return (
        <Component
          onClick={() => cellActionOnClickMockedFn(columnId, rowIndex)}
          data-test-subj={'fake-cell-first-action'}
          iconType="refresh"
          aria-label={label}
        />
      );
    };
    return [fakeCellAction];
  };
  return {
    getCellActions: mockedGetCellActions,
    visibleCellActions: 2,
    disabledCellActions: [],
  };
};

const { fix, cleanup } = getJsDomPerformanceFix();

beforeAll(() => {
  fix();
});

afterAll(() => {
  cleanup();
});

describe('AlertsTable', () => {
  const alertsTableConfiguration: AlertsTableConfigurationRegistry = {
    id: '',
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
        id: 0,
        items: [
          {
            label: 'Fake Bulk Action',
            key: 'fakeBulkAction',
            'data-test-subj': 'fake-bulk-action',
            disableOnQuery: false,
            onClick: () => {},
          },
        ],
      },
    ],
    useFieldBrowserOptions: () => {
      return {
        createFieldButton: () => (
          <EuiButton data-test-subj={TEST_ID.FIELD_BROWSER_CUSTOM_CREATE_BTN} />
        ),
      };
    },
    useActionsColumn: () => {
      return {
        renderCustomActionsRow: () => (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="analyzeEvent"
              color="primary"
              onClick={() => {}}
              size="s"
              data-test-subj="fake-action"
              aria-label="fake-action"
            />
          </EuiFlexItem>
        ),
      };
    },
  };

  const browserFields: BrowserFields = {
    kibana: {
      fields: {
        [AlertsField.uuid]: {
          category: 'kibana',
          name: AlertsField.uuid,
        },
        [AlertsField.name]: {
          category: 'kibana',
          name: AlertsField.name,
        },
        [AlertsField.reason]: {
          category: 'kibana',
          name: AlertsField.reason,
        },
      },
    },
  };

  const casesMap = getCasesMockMap();
  const maintenanceWindowsMap = getMaintenanceWindowMockMap();

  const tableProps: AlertsTableProps = {
    alertsTableConfiguration,
    cases: { data: casesMap, isLoading: false },
    maintenanceWindows: { data: maintenanceWindowsMap, isLoading: false },
    columns,
    deletedEventIds: [],
    disabledCellActions: [],
    pageSizeOptions: [1, 10, 20, 50, 100],
    leadingControlColumns: [],
    trailingControlColumns: [],
    visibleColumns: columns.map((c) => c.id),
    'data-test-subj': 'testTable',
    onToggleColumn: () => {},
    onResetColumns: () => {},
    onChangeVisibleColumns: () => {},
    browserFields,
    query: {},
    pagination: { pageIndex: 0, pageSize: 1 },
    sort: [],
    isLoading: false,
    alerts,
    oldAlertsData,
    ecsAlertsData,
    getInspectQuery: () => ({ request: [], response: [] }),
    refetch: () => {},
    alertsCount: alerts.length,
    onSortChange: jest.fn(),
    onPageChange: jest.fn(),
  };

  const defaultBulkActionsState = {
    rowSelection: new Map<number, RowSelectionState>(),
    isAllSelected: false,
    areAllVisibleRowsSelected: false,
    rowCount: 4,
    updatedAt: Date.now(),
  };

  const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
  useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView: jest.fn() });

  const AlertsTableWithProviders: React.FunctionComponent<
    AlertsTableProps & { initialBulkActionsState?: BulkActionsState }
  > = (props) => {
    const renderer = useMemo(() => createAppMockRenderer(AlertsTableQueryContext), []);
    const AppWrapper = renderer.AppWrapper;

    const initialBulkActionsState = useReducer(
      bulkActionsReducer,
      props.initialBulkActionsState || defaultBulkActionsState
    );

    return (
      <AppWrapper>
        <AlertsTableContext.Provider
          value={{
            mutedAlerts: {},
            bulkActions: initialBulkActionsState,
          }}
        >
          <AlertsTable {...props} />
        </AlertsTableContext.Provider>
      </AppWrapper>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alerts table UI', () => {
    it('should support sorting', async () => {
      const renderResult = render(<AlertsTableWithProviders {...tableProps} />);
      userEvent.click(
        renderResult.container.querySelector('.euiDataGridHeaderCell__button')!,
        undefined,
        {
          skipPointerEventsCheck: true,
        }
      );

      await waitForEuiPopoverOpen();

      userEvent.click(
        renderResult.getByTestId(`dataGridHeaderCellActionGroup-${columns[0].id}`),
        undefined,
        {
          skipPointerEventsCheck: true,
        }
      );

      userEvent.click(renderResult.getByTitle('Sort A-Z'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(tableProps.onSortChange).toHaveBeenCalledWith([
        { direction: 'asc', id: 'kibana.alert.rule.name' },
      ]);
    });

    it('should support pagination', async () => {
      const renderResult = render(
        <AlertsTableWithProviders {...tableProps} pagination={{ pageIndex: 0, pageSize: 1 }} />
      );
      userEvent.click(renderResult.getByTestId('pagination-button-1'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(tableProps.onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 1 });
    });

    it('should show when it was updated', () => {
      const { getByTestId } = render(<AlertsTableWithProviders {...tableProps} />);
      expect(getByTestId('toolbar-updated-at')).not.toBe(null);
    });

    it('should show alerts count', () => {
      const { getByTestId } = render(<AlertsTableWithProviders {...tableProps} />);
      expect(getByTestId('toolbar-alerts-count')).not.toBe(null);
    });

    it('should show alert status', () => {
      const props = {
        ...tableProps,
        showAlertStatusWithFlapping: true,
        pagination: { pageIndex: 0, pageSize: 10 },
        alertsTableConfiguration: {
          ...alertsTableConfiguration,
          getRenderCellValue: undefined,
        },
      };

      const { queryAllByTestId } = render(<AlertsTableWithProviders {...props} />);
      expect(queryAllByTestId('alertLifecycleStatusBadge')[0].textContent).toEqual('Flapping');
      expect(queryAllByTestId('alertLifecycleStatusBadge')[1].textContent).toEqual('Active');
      expect(queryAllByTestId('alertLifecycleStatusBadge')[2].textContent).toEqual('Recovered');
      expect(queryAllByTestId('alertLifecycleStatusBadge')[3].textContent).toEqual('Recovered');
    });

    describe('leading control columns', () => {
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
          pagination: { pageIndex: 0, pageSize: 1 },
        };
        const wrapper = render(<AlertsTableWithProviders {...customTableProps} />);
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

        const { queryByTestId } = render(<AlertsTableWithProviders {...customTableProps} />);
        expect(queryByTestId('testActionColumn')).not.toBe(null);
        expect(queryByTestId('testActionColumn2')).not.toBe(null);
      });

      it('should not add expansion action when not set', () => {
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

        const { queryByTestId } = render(<AlertsTableWithProviders {...customTableProps} />);
        expect(queryByTestId('testActionColumn')).not.toBe(null);
        expect(queryByTestId('testActionColumn2')).not.toBe(null);
        expect(queryByTestId('expandColumnCellOpenFlyoutButton-0')).toBe(null);
      });

      it('should render no action column if there is neither the action nor the expand action config is set', () => {
        const customTableProps = {
          ...tableProps,
          alertsTableConfiguration: {
            ...alertsTableConfiguration,
            useActionsColumn: undefined,
          },
        };

        const { queryByTestId } = render(<AlertsTableWithProviders {...customTableProps} />);
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
            pagination: { pageIndex: 0, pageSize: 10 },
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
                  width: 124,
                };
              },
            },
          };
        });

        it('should show the row loader when callback triggered', async () => {
          render(<AlertsTableWithProviders {...customTableProps} />);
          fireEvent.click((await screen.findAllByTestId('testActionColumn'))[0]);

          // the callback given to our clients to run when they want to update the loading state
          act(() => {
            mockedFn.mock.calls[0][0].setIsActionLoading(true);
          });

          expect(await screen.findAllByTestId('row-loader')).toHaveLength(1);
          const selectedOptions = await screen.findAllByTestId('dataGridRowCell');

          // first row, first column
          expect(within(selectedOptions[0]).getByLabelText('Loading')).toBeDefined();
          expect(
            within(selectedOptions[0]).queryByTestId('bulk-actions-row-cell')
          ).not.toBeInTheDocument();

          // second row, first column
          expect(within(selectedOptions[6]).queryByLabelText('Loading')).not.toBeInTheDocument();
          expect(within(selectedOptions[6]).getByTestId('bulk-actions-row-cell')).toBeDefined();
        });

        it('should show the row loader when callback triggered with false', async () => {
          const initialBulkActionsState = {
            ...defaultBulkActionsState,
            rowSelection: new Map([[0, { isLoading: true }]]),
          };

          render(
            <AlertsTableWithProviders
              {...customTableProps}
              initialBulkActionsState={initialBulkActionsState}
            />
          );
          fireEvent.click((await screen.findAllByTestId('testActionColumn'))[0]);

          // the callback given to our clients to run when they want to update the loading state
          act(() => {
            mockedFn.mock.calls[0][0].setIsActionLoading(false);
          });

          expect(screen.queryByTestId('row-loader')).not.toBeInTheDocument();
        });
      });
    });

    describe('cell Actions', () => {
      let customTableProps: AlertsTableProps;

      beforeEach(() => {
        customTableProps = {
          ...tableProps,
          alertsTableConfiguration: {
            ...alertsTableConfiguration,
            useCellActions: mockedUseCellActions,
          },
        };
      });

      it('Should render cell actions on hover', async () => {
        render(<AlertsTableWithProviders {...customTableProps} />);

        const reasonFirstRow = (await screen.findAllByTestId('dataGridRowCell'))[3];

        fireEvent.mouseOver(reasonFirstRow);

        await waitFor(() => {
          expect(screen.getByTestId('fake-cell-first-action')).toBeInTheDocument();
        });
      });
      it('cell Actions can be expanded', async () => {
        render(<AlertsTableWithProviders {...customTableProps} />);
        const reasonFirstRow = (await screen.findAllByTestId('dataGridRowCell'))[3];

        fireEvent.mouseOver(reasonFirstRow);

        expect(await screen.findByTestId(TEST_ID.CELL_ACTIONS_EXPAND)).toBeVisible();

        fireEvent.click(await screen.findByTestId(TEST_ID.CELL_ACTIONS_EXPAND));

        expect(await screen.findByTestId(TEST_ID.CELL_ACTIONS_POPOVER)).toBeVisible();
        expect(await screen.findAllByLabelText(/fake cell first action/i)).toHaveLength(2);
      });
    });

    describe('Alert Registry use field Browser Hook', () => {
      it('field Browser Options hook is working correctly', async () => {
        render(
          <AlertsTableWithProviders
            {...tableProps}
            initialBulkActionsState={{
              ...defaultBulkActionsState,
              rowSelection: new Map(),
            }}
          />
        );

        const fieldBrowserBtn = screen.getByTestId(TEST_ID.FIELD_BROWSER_BTN);
        expect(fieldBrowserBtn).toBeVisible();

        fireEvent.click(fieldBrowserBtn);

        expect(await screen.findByTestId(TEST_ID.FIELD_BROWSER)).toBeVisible();

        expect(await screen.findByTestId(TEST_ID.FIELD_BROWSER_CUSTOM_CREATE_BTN)).toBeVisible();
      });
    });

    describe('cases column', () => {
      const props = {
        ...tableProps,
        pageSize: alerts.length,
      };

      it('should show the cases column', async () => {
        render(<AlertsTableWithProviders {...props} />);
        expect(await screen.findByText('Cases')).toBeInTheDocument();
      });

      it('should show the cases titles correctly', async () => {
        render(<AlertsTableWithProviders {...props} pagination={{ pageIndex: 0, pageSize: 10 }} />);
        expect(await screen.findByText('Test case')).toBeInTheDocument();
        expect(await screen.findByText('Test case 2')).toBeInTheDocument();
      });

      it('show loading skeleton if it loads cases', async () => {
        render(
          <AlertsTableWithProviders
            {...props}
            pagination={{ pageIndex: 0, pageSize: 10 }}
            cases={{ ...props.cases, isLoading: true }}
          />
        );

        expect((await screen.findAllByTestId('cases-cell-loading')).length).toBe(4);
      });

      it('shows the cases tooltip', async () => {
        render(<AlertsTableWithProviders {...props} />);
        expect(await screen.findByText('Test case')).toBeInTheDocument();

        userEvent.hover(screen.getByText('Test case'));

        expect(await screen.findByTestId('cases-components-tooltip')).toBeInTheDocument();
      });
    });

    describe('dynamic row height mode', () => {
      it('should render a non-virtualized grid body when the dynamicRowHeight option is on', async () => {
        const { container } = render(<AlertsTableWithProviders {...tableProps} dynamicRowHeight />);

        expect(container.querySelector('.euiDataGrid__customRenderBody')).toBeTruthy();
      });

      it('should render a virtualized grid body when the dynamicRowHeight option is off', async () => {
        const { container } = render(<AlertsTableWithProviders {...tableProps} />);

        expect(container.querySelector('.euiDataGrid__virtualized')).toBeTruthy();
      });
    });
  });
});
