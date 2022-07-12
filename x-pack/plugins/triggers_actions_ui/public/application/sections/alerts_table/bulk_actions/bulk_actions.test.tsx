/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useReducer } from 'react';

import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';

import { BulkActionsContext } from './context';
import { AlertsTable } from '../alerts_table';
import { AlertsField, AlertsTableProps, BulkActionsState } from '../../../../types';
import { EuiContextMenuItem } from '@elastic/eui';
import { bulkActionsReducer } from './reducer';

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
      _id: 'alert0',
    },
    {
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
      _id: 'alert1',
    },
    {
      [AlertsField.name]: ['five'],
      [AlertsField.reason]: ['size'],
      _id: 'alert2',
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
    bulkActions: [],
    deletedEventIds: [],
    disabledCellActions: [],
    pageSize: 2,
    pageSizeOptions: [2, 4],
    leadingControlColumns: [],
    showCheckboxes: false,
    showExpandToDetails: true,
    trailingControlColumns: [],
    alerts,
    useFetchAlertsData,
    visibleColumns: columns.map((c) => c.id),
    'data-test-subj': 'testTable',
  };

  const tablePropsWithBulkActions = {
    ...tableProps,
    alertsTableConfiguration: {
      ...alertsTableConfiguration,

      useBulkActions: () => {
        return {
          render: () => [
            <EuiContextMenuItem onClick={() => {}}>{'Fake Bulk Action'}</EuiContextMenuItem>,
          ],
        };
      },
    },
  };

  const defaultBulkActionsState = {
    rowSelection: new Set<number>(),
    isAllSelected: false,
    isPageSelected: false,
    pageSize: 2,
  };

  const AlertsTableWithBulkActionsContext: React.FunctionComponent<
    AlertsTableProps & { initialBulkActionsState?: BulkActionsState }
  > = (props) => {
    const initialBulkActionsState = useReducer(
      bulkActionsReducer,
      props.initialBulkActionsState || defaultBulkActionsState
    );

    return (
      <BulkActionsContext.Provider value={initialBulkActionsState}>
        <AlertsTable {...props} />
      </BulkActionsContext.Provider>
    );
  };

  describe('when the bulk action hook is not set', () => {
    it('should not show the bulk actions column', () => {
      const { queryByTestId } = render(<AlertsTable {...tableProps} />);
      expect(queryByTestId('bulk-actions-header')).toBeNull();
    });
  });

  describe('when the bulk action hook is set', () => {
    it('should show the bulk actions column', () => {
      const { getByTestId } = render(<AlertsTable {...tablePropsWithBulkActions} />);
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
            isPageSelected: true,
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
              isPageSelected: true,
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
        it.only('should show the right amount of alerts selected', () => {
          const { getByTestId, getAllByTestId } = render(
            <AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />
          );
          userEvent.click(getByTestId('pagination-button-1'));
          userEvent.click(getByTestId('bulk-actions-header'));
          const { getByText } = within(getByTestId('selectedShowBulkActionsButton'));
          expect(getByText('Selected 1 alerts')).toBeDefined();
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
            isPageSelected: true,
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
          const mockedFn = jest.fn(() => [
            <EuiContextMenuItem key={'key'} onClick={() => {}}>
              {'Fake Bulk Action'}
            </EuiContextMenuItem>,
          ]);
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Set([1]),
            },
            alertsTableConfiguration: {
              ...alertsTableConfiguration,

              useBulkActions: () => {
                return {
                  render: mockedFn,
                };
              },
            },
          };

          const { getByText, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );

          userEvent.click(getByTestId('selectedShowBulkActionsButton'));

          await waitFor(() => expect(getByText('Fake Bulk Action')).toBeVisible());

          userEvent.click(getByText('Fake Bulk Action'));
          expect(mockedFn.mock.calls[mockedFn.mock.calls.length - 1]).toEqual([false, ['alert1']]);
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
                isPageSelected: true,
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
            const mockedFn = jest.fn(() => [
              <EuiContextMenuItem key={'key'} onClick={() => {}}>
                {'Fake Bulk Action'}
              </EuiContextMenuItem>,
            ]);
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                isPageSelected: true,
                isAllSelected: true,
                rowSelection: new Set([0, 1]),
              },
              alertsTableConfiguration: {
                ...alertsTableConfiguration,

                useBulkActions: () => {
                  return {
                    render: mockedFn,
                  };
                },
              },
            };

            const { getByText, getByTestId } = render(
              <AlertsTableWithBulkActionsContext {...props} />
            );

            userEvent.click(getByTestId('selectedShowBulkActionsButton'));

            await waitFor(() => expect(getByText('Fake Bulk Action')).toBeVisible());

            userEvent.click(getByText('Fake Bulk Action'));
            expect(mockedFn.mock.calls[mockedFn.mock.calls.length - 1]).toEqual([
              true,
              ['alert0', 'alert1'],
            ]);
          });
        });
      });
    });
  });
});
