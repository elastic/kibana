/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useReducer } from 'react';

import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';

import { BulkActionsContext } from './context';
import { AlertsTable } from '../alerts_table';
import { AlertsField, AlertsTableProps, BulkActionsState } from '../../../../types';
import { bulkActionsReducer } from './reducer';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('@kbn/data-plugin/public');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));

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

describe('AlertsTable.BulkActions', () => {
  const alerts = [
    {
      [AlertsField.name]: ['one'],
      [AlertsField.reason]: ['two'],
      [AlertsField.uuid]: ['uuidone'],
      _id: 'alert0',
      _index: 'idx0',
    },
    {
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
      [AlertsField.uuid]: ['uuidtwo'],
      _id: 'alert1',
      _index: 'idx1',
    },
  ] as unknown as EcsFieldsResponse[];

  const alertsData = {
    activePage: 0,
    alerts,
    alertsCount: alerts.length,
    isInitializing: false,
    isLoading: false,
    getInspectQuery: () => ({ request: {}, response: {} }),
    onColumnsChange: () => {},
    onPageChange: () => {},
    onSortChange: () => {},
    refresh: () => {},
    sort: [],
  };

  const alertsTableConfiguration = {
    id: '',
    casesFeatureId: 'test',
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
  };

  const tableProps = {
    alertsTableConfiguration,
    columns,
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 2,
    pageSizeOptions: [2, 4],
    leadingControlColumns: [],
    showExpandToDetails: true,
    trailingControlColumns: [],
    alerts,
    useFetchAlertsData: () => alertsData,
    visibleColumns: columns.map((c) => c.id),
    'data-test-subj': 'testTable',
    updatedAt: Date.now(),
  };

  const tablePropsWithBulkActions = {
    ...tableProps,
    alertsTableConfiguration: {
      ...alertsTableConfiguration,

      useBulkActions: () => [
        {
          label: 'Fake Bulk Action',
          key: 'fakeBulkAction',
          'data-test-subj': 'fake-bulk-action',
          disableOnQuery: false,
          onClick: () => {},
        },
      ],
    },
  };

  const defaultBulkActionsState = {
    rowSelection: new Set<number>(),
    isAllSelected: false,
    areAllVisibleRowsSelected: false,
    rowCount: 2,
  };

  const AlertsTableWithBulkActionsContext: React.FunctionComponent<
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

  describe('when the bulk action hook is not set', () => {
    it('should not show the bulk actions column', () => {
      const { queryByTestId } = render(
        <IntlProvider locale="en">
          <AlertsTable {...tableProps} />
        </IntlProvider>
      );
      expect(queryByTestId('bulk-actions-header')).toBeNull();
    });
  });

  describe('when the bulk action hook is set', () => {
    it('should show the bulk actions column', () => {
      const { getByTestId } = render(
        <IntlProvider locale="en">
          <AlertsTable {...tablePropsWithBulkActions} />
        </IntlProvider>
      );
      expect(getByTestId('bulk-actions-header')).toBeDefined();
    });

    describe('and click on select all', () => {
      it('should check that all rows are selected', async () => {
        const { getAllByTestId, getByTestId } = render(
          <AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />
        );
        const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeFalsy();
        expect(bulkActionsCells[1].checked).toBeFalsy();

        userEvent.click(getByTestId('bulk-actions-header'));

        expect(bulkActionsCells[0].checked).toBeTruthy();
        expect(bulkActionsCells[1].checked).toBeTruthy();
      });

      it('should show the right amount of alerts selected', () => {
        const props = {
          ...tablePropsWithBulkActions,
          initialBulkActionsState: {
            ...defaultBulkActionsState,
            areAllVisibleRowsSelected: true,
            rowSelection: new Set([0, 1]),
          },
        };

        const { getByTestId } = render(<AlertsTableWithBulkActionsContext {...props} />);
        const { getByText } = within(getByTestId('selectedShowBulkActionsButton'));
        expect(getByText('Selected 2 alerts')).toBeDefined();
      });

      describe('and clicking on a single row', () => {
        it('should uncheck the select all header column', () => {
          // state after having already clicked on select all before
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              areAllVisibleRowsSelected: true,
              rowSelection: new Set([0, 1]),
            },
          };
          const { getAllByTestId, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );
          const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
          const columnHeader = getByTestId('bulk-actions-header') as HTMLInputElement;
          expect(columnHeader.checked).toBeTruthy();

          userEvent.click(bulkActionsCells[1]);
          expect(columnHeader.checked).toBeFalsy();
        });
      });

      describe('and its a page with count of alerts different than page size', () => {
        it('should show the right amount of alerts selected', () => {
          const secondPageAlerts = [
            {
              [AlertsField.name]: ['five'],
              [AlertsField.reason]: ['six'],
              _id: 'alert2',
            },
          ] as unknown as EcsFieldsResponse[];
          const props = {
            ...tablePropsWithBulkActions,
            alerts: secondPageAlerts,
            useFetchAlertsData: () => {
              return {
                ...alertsData,
                alerts: secondPageAlerts,
                alertsCount: secondPageAlerts.length,
                activePage: 1,
              };
            },
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              areAllVisibleRowsSelected: true,
              rowSelection: new Set([0]),
            },
          };
          const { getByTestId, getAllByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );
          const { getByText } = within(getByTestId('selectedShowBulkActionsButton'));
          expect(getByText('Selected 1 alert')).toBeDefined();
          expect(getAllByTestId('bulk-actions-row-cell').length).toBe(1);
        });
      });
    });

    describe('and clicking unselect all', () => {
      it('should uncheck all rows', () => {
        // state after having already clicked on select all before
        const props = {
          ...tablePropsWithBulkActions,
          initialBulkActionsState: {
            ...defaultBulkActionsState,
            areAllVisibleRowsSelected: true,
            rowSelection: new Set([0, 1]),
          },
        };
        const { getAllByTestId, getByTestId } = render(
          <AlertsTableWithBulkActionsContext {...props} />
        );
        const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeTruthy();
        expect(bulkActionsCells[1].checked).toBeTruthy();

        userEvent.click(getByTestId('bulk-actions-header'));

        expect(bulkActionsCells[0].checked).toBeFalsy();
        expect(bulkActionsCells[1].checked).toBeFalsy();
      });
    });

    describe('and a row is selected', () => {
      it('should show the toolbar', () => {
        const { queryByTestId, getAllByTestId, getByTestId } = render(
          <AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />
        );

        expect(queryByTestId('selectedShowBulkActionsButton')).toBeNull();
        expect(queryByTestId('selectAllAlertsButton')).toBeNull();

        const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        userEvent.click(bulkActionsCells[0]);

        expect(getByTestId('selectedShowBulkActionsButton')).toBeDefined();
        expect(getByTestId('selectAllAlertsButton')).toBeDefined();
      });

      describe('and the last remaining row is unchecked', () => {
        it('should hide the toolbar', () => {
          // state after having already clicked on select all before
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Set([0]),
            },
          };
          const { queryByTestId, getAllByTestId, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );

          expect(getByTestId('selectedShowBulkActionsButton')).toBeDefined();
          expect(getByTestId('selectAllAlertsButton')).toBeDefined();

          const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
          userEvent.click(bulkActionsCells[0]);

          expect(queryByTestId('selectAllAlertsButton')).toBeNull();
          expect(queryByTestId('selectedShowBulkActionsButton')).toBeNull();
        });
      });
    });

    describe('and the toolbar is on ', () => {
      describe('and a bulk action is executed', () => {
        it('should return the selected alert ids', async () => {
          const mockedFn = jest.fn();
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Set([1]),
            },
            alertsTableConfiguration: {
              ...alertsTableConfiguration,

              useBulkActions: () => [
                {
                  label: 'Fake Bulk Action',
                  key: 'fakeBulkAction',
                  'data-test-subj': 'fake-bulk-action',
                  disableOnQuery: false,
                  onClick: mockedFn,
                },
              ],
            },
          };

          const { getByText, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );

          userEvent.click(getByTestId('selectedShowBulkActionsButton'));
          await waitForEuiPopoverOpen();

          userEvent.click(getByText('Fake Bulk Action'));
          expect(mockedFn.mock.calls[0]).toEqual([
            [
              {
                _id: 'alert1',
                _index: 'idx1',
                data: [
                  {
                    field: 'kibana.alert.rule.name',
                    value: ['three'],
                  },
                  {
                    field: 'kibana.alert.rule.uuid',
                    value: ['uuidtwo'],
                  },
                ],
                ecs: {
                  _id: 'alert1',
                  _index: 'idx1',
                },
              },
            ],
            false,
          ]);
        });
      });

      describe('and select all is clicked', () => {
        it('should check all the visible rows', () => {
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Set([0]),
            },
          };

          const { getAllByTestId, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );

          const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
          expect(bulkActionsCells[0].checked).toBeTruthy();
          expect(bulkActionsCells[1].checked).toBeFalsy();
          userEvent.click(getByTestId('selectAllAlertsButton'));
          expect(bulkActionsCells[0].checked).toBeTruthy();
          expect(bulkActionsCells[1].checked).toBeTruthy();
        });

        describe('and clear the selection is clicked', () => {
          it('should turn off the toolbar', () => {
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                areAllVisibleRowsSelected: true,
                isAllSelected: true,
                rowSelection: new Set([0, 1]),
              },
            };

            const { getAllByTestId, getByTestId } = render(
              <AlertsTableWithBulkActionsContext {...props} />
            );

            const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
            expect(bulkActionsCells[0].checked).toBeTruthy();
            expect(bulkActionsCells[1].checked).toBeTruthy();
            userEvent.click(getByTestId('selectAllAlertsButton'));
            expect(bulkActionsCells[0].checked).toBeFalsy();
            expect(bulkActionsCells[1].checked).toBeFalsy();
          });
        });

        describe('and executing a bulk action', () => {
          it('should return the are all selected flag set to true', async () => {
            const mockedFn = jest.fn();
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                isAllSelected: true,
                rowCount: 2,
                rowSelection: new Set([0, 1]),
              },
              alertsTableConfiguration: {
                ...alertsTableConfiguration,
                useBulkActions: () => [
                  {
                    label: 'Fake Bulk Action',
                    key: 'fakeBulkAction',
                    'data-test-subj': 'fake-bulk-action',
                    disableOnQuery: false,
                    onClick: mockedFn,
                  },
                ],
              },
            };

            const { getByText, getByTestId } = render(
              <AlertsTableWithBulkActionsContext {...props} />
            );

            userEvent.click(getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            userEvent.click(getByText('Fake Bulk Action'));
            expect(mockedFn.mock.calls[0]).toEqual([
              [
                {
                  _id: 'alert0',
                  _index: 'idx0',
                  data: [
                    {
                      field: 'kibana.alert.rule.name',
                      value: ['one'],
                    },
                    {
                      field: 'kibana.alert.rule.uuid',
                      value: ['uuidone'],
                    },
                  ],
                  ecs: {
                    _id: 'alert0',
                    _index: 'idx0',
                  },
                },
                {
                  _id: 'alert1',
                  _index: 'idx1',
                  data: [
                    {
                      field: 'kibana.alert.rule.name',
                      value: ['three'],
                    },
                    {
                      field: 'kibana.alert.rule.uuid',
                      value: ['uuidtwo'],
                    },
                  ],
                  ecs: {
                    _id: 'alert1',
                    _index: 'idx1',
                  },
                },
              ],
              true,
            ]);
          });
        });
      });
    });
  });
});
