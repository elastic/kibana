/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useReducer } from 'react';

import { render, screen, within, fireEvent } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';

import { BulkActionsContext } from './context';
import { AlertsTable } from '../alerts_table';
import {
  AlertsField,
  AlertsTableProps,
  BulkActionsState,
  RowSelectionState,
} from '../../../../types';
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
    onToggleColumn: () => {},
    onResetColumns: () => {},
    onColumnsChange: () => {},
    onChangeVisibleColumns: () => {},
    browserFields: {},
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
    rowSelection: new Map<number, RowSelectionState>(),
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
        render(<AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />);
        let bulkActionsCells = screen.getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeFalsy();
        expect(bulkActionsCells[1].checked).toBeFalsy();

        fireEvent.click(screen.getByTestId('bulk-actions-header'));

        bulkActionsCells = screen.getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeTruthy();
        expect(bulkActionsCells[1].checked).toBeTruthy();
      });

      it('should show the right amount of alerts selected', async () => {
        const props = {
          ...tablePropsWithBulkActions,
          initialBulkActionsState: {
            ...defaultBulkActionsState,
            areAllVisibleRowsSelected: true,
            rowSelection: new Map([
              [0, { isLoading: false }],
              [1, { isLoading: false }],
            ]),
          },
        };

        render(<AlertsTableWithBulkActionsContext {...props} />);
        expect(await screen.findByText('Selected 2 alerts')).toBeDefined();
      });

      describe('and clicking on a single row', () => {
        it('should uncheck the select all header column', () => {
          // state after having already clicked on select all before
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              areAllVisibleRowsSelected: true,
              rowSelection: new Map([
                [0, { isLoading: false }],
                [1, { isLoading: false }],
              ]),
            },
          };
          render(<AlertsTableWithBulkActionsContext {...props} />);
          const bulkActionsCells = screen.getAllByTestId(
            'bulk-actions-row-cell'
          ) as HTMLInputElement[];
          expect(
            (screen.getByTestId('bulk-actions-header') as HTMLInputElement).checked
          ).toBeTruthy();

          fireEvent.click(bulkActionsCells[1]);
          expect(
            (screen.getByTestId('bulk-actions-header') as HTMLInputElement).checked
          ).toBeFalsy();
        });
      });

      describe('and its a page with count of alerts different than page size', () => {
        it('should show the right amount of alerts selected', async () => {
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
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };
          render(<AlertsTableWithBulkActionsContext {...props} />);

          expect(await screen.findByText('Selected 1 alert')).toBeDefined();
          expect((await screen.findAllByTestId('bulk-actions-row-cell')).length).toBe(1);
        });
      });
    });

    describe('and clicking unselect all', () => {
      it('should uncheck all rows', async () => {
        // state after having already clicked on select all before
        const props = {
          ...tablePropsWithBulkActions,
          initialBulkActionsState: {
            ...defaultBulkActionsState,
            areAllVisibleRowsSelected: true,
            rowSelection: new Map([
              [0, { isLoading: false }],
              [1, { isLoading: false }],
            ]),
          },
        };
        render(<AlertsTableWithBulkActionsContext {...props} />);
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0].checked
        ).toBeTruthy();
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1].checked
        ).toBeTruthy();

        fireEvent.click(await screen.findByTestId('bulk-actions-header'));

        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0].checked
        ).toBeFalsy();
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1].checked
        ).toBeFalsy();
      });
    });

    describe('and a row is selected', () => {
      it('should show the toolbar', async () => {
        render(<AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />);

        expect(screen.queryByTestId('selectedShowBulkActionsButton')).toBeNull();
        expect(screen.queryByTestId('selectAllAlertsButton')).toBeNull();

        const bulkActionsCells = screen.getAllByTestId(
          'bulk-actions-row-cell'
        ) as HTMLInputElement[];
        fireEvent.click(bulkActionsCells[0]);

        expect(await screen.findByTestId('selectedShowBulkActionsButton')).toBeDefined();
        expect(await screen.findByTestId('selectAllAlertsButton')).toBeDefined();
      });

      describe('and the last remaining row is unchecked', () => {
        it('should hide the toolbar', () => {
          // state after having already clicked on select all before
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };
          const { queryByTestId, getAllByTestId, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );

          expect(getByTestId('selectedShowBulkActionsButton')).toBeDefined();
          expect(getByTestId('selectAllAlertsButton')).toBeDefined();

          const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
          fireEvent.click(bulkActionsCells[0]);

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
              rowSelection: new Map([[1, { isLoading: false }]]),
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

          render(<AlertsTableWithBulkActionsContext {...props} />);

          fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
          await waitForEuiPopoverOpen();

          fireEvent.click(await screen.findByText('Fake Bulk Action'));
          expect(mockedFn.mock.calls[0][0]).toEqual([
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
          ]);
          expect(mockedFn.mock.calls[0][1]).toEqual(false);
          expect(mockedFn.mock.calls[0][2]).toBeDefined(); // it's a callback
        });

        describe('and the callback to represent the loading state is executed', () => {
          let mockedFn: jest.Mock;
          let props: AlertsTableProps;

          beforeEach(() => {
            mockedFn = jest.fn();
            props = {
              ...tablePropsWithBulkActions,
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
          });

          it('should show the loading state on each selected row', async () => {
            const initialBulkActionsState = {
              ...defaultBulkActionsState,
              rowSelection: new Map([[1, { isLoading: false }]]),
            };
            render(
              <AlertsTableWithBulkActionsContext
                {...props}
                initialBulkActionsState={initialBulkActionsState}
              />
            );
            fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(await screen.findByText('Fake Bulk Action'));

            // the callback given to our clients to run when they want to update the loading state
            mockedFn.mock.calls[0][2](true);

            expect(await screen.findAllByTestId('row-loader')).toHaveLength(1);
            const selectedOptions = await screen.findAllByTestId('dataGridRowCell');
            // first row, first column
            expect(within(selectedOptions[0]).queryByLabelText('Loading')).not.toBeInTheDocument();
            expect(within(selectedOptions[0]).getByRole('checkbox')).toBeDefined();

            // second row, first column
            expect(within(selectedOptions[4]).getByLabelText('Loading')).toBeDefined();
            expect(within(selectedOptions[4]).queryByRole('checkbox')).not.toBeInTheDocument();
          });

          it('should hide the loading state on each selected row', async () => {
            const initialBulkActionsState = {
              ...defaultBulkActionsState,
              rowSelection: new Map([[1, { isLoading: true }]]),
            };
            render(
              <AlertsTableWithBulkActionsContext
                {...props}
                initialBulkActionsState={initialBulkActionsState}
              />
            );
            fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(await screen.findByText('Fake Bulk Action'));

            // the callback given to our clients to run when they want to update the loading state
            mockedFn.mock.calls[0][2](false);

            expect(screen.queryByTestId('row-loader')).not.toBeInTheDocument();
          });
        });
      });

      describe('and select all is clicked', () => {
        it('should check all the visible rows', async () => {
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };

          render(<AlertsTableWithBulkActionsContext {...props} />);

          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
              .checked
          ).toBeTruthy();
          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
              .checked
          ).toBeFalsy();

          fireEvent.click(screen.getByTestId('selectAllAlertsButton'));

          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
              .checked
          ).toBeTruthy();
          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
              .checked
          ).toBeTruthy();
        });

        describe('and clear the selection is clicked', () => {
          it('should turn off the toolbar', async () => {
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                areAllVisibleRowsSelected: true,
                isAllSelected: true,
                rowSelection: new Map([
                  [0, { isLoading: false }],
                  [1, { isLoading: false }],
                ]),
              },
            };

            render(<AlertsTableWithBulkActionsContext {...props} />);

            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
                .checked
            ).toBeTruthy();
            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
                .checked
            ).toBeTruthy();

            fireEvent.click(screen.getByTestId('selectAllAlertsButton'));

            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
                .checked
            ).toBeFalsy();
            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
                .checked
            ).toBeFalsy();
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
                rowSelection: new Map([
                  [0, { isLoading: false }],
                  [1, { isLoading: false }],
                ]),
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

            fireEvent.click(getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(getByText('Fake Bulk Action'));
            expect(mockedFn.mock.calls[0][0]).toEqual([
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
            ]);
            expect(mockedFn.mock.calls[0][1]).toEqual(true);
            expect(mockedFn.mock.calls[0][2]).toBeDefined();
          });
        });
      });
    });
  });
});
