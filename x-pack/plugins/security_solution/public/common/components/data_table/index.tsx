/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiDataGridRefProps,
  EuiDataGridColumn,
  EuiDataGridCellValueElementProps,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
  EuiDataGridControlColumn,
  EuiDataGridPaginationProps,
  EuiDataGridRowHeightsOptions,
} from '@elastic/eui';
import { EuiDataGrid, EuiProgress } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import React, { useCallback, useEffect, useMemo, useContext, useRef } from 'react';
import { useDispatch } from 'react-redux';

import styled, { ThemeContext } from 'styled-components';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import type { FieldBrowserOptions } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  useDataGridColumnsSecurityCellActions,
  SecurityCellActionsTrigger,
  type UseDataGridColumnsSecurityCellActionsProps,
} from '../cell_actions';
import type {
  CellValueElementProps,
  ColumnHeaderOptions,
  RowRenderer,
} from '../../../../common/types/timeline';

import type { TimelineItem } from '../../../../common/search_strategy/timeline';

import { getColumnHeader, getColumnHeaders } from './column_headers/helpers';
import { addBuildingBlockStyle, mapSortDirectionToDirection, mapSortingColumns } from './helpers';

import type { BrowserFields } from '../../../../common/search_strategy/index_fields';
import { REMOVE_COLUMN } from './column_headers/translations';
import { dataTableActions, dataTableSelectors } from '../../store/data_table';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';
import { useKibana } from '../../lib/kibana';
import { getPageRowIndex } from './pagination';
import { UnitCount } from '../toolbar/unit';
import { useShallowEqualSelector } from '../../hooks/use_selector';
import { tableDefaults } from '../../store/data_table/defaults';

const DATA_TABLE_ARIA_LABEL = i18n.translate('xpack.securitySolution.dataTable.ariaLabel', {
  defaultMessage: 'Alerts',
});

export interface DataTableProps {
  additionalControls?: React.ReactNode;
  browserFields: BrowserFields;
  bulkActions?: BulkActionsProp;
  data: TimelineItem[];
  disableCellActions?: boolean;
  fieldBrowserOptions?: FieldBrowserOptions;
  id: string;
  leadingControlColumns: EuiDataGridControlColumn[];
  loadPage: (newActivePage: number) => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  hasCrudPermissions?: boolean;
  unitCountText: string;
  pagination: EuiDataGridPaginationProps;
  totalItems: number;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  isEventRenderedView?: boolean;
}

const ES_LIMIT_COUNT = 9999;

const gridStyle = (isEventRenderedView: boolean | undefined = false): EuiDataGridStyle => ({
  border: 'none',
  fontSize: 's',
  header: 'underline',
  stripes: isEventRenderedView === true,
});

const EuiDataGridContainer = styled.div<{ hideLastPage: boolean }>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => `${hideLastPage ? 'display:none' : ''}`};
    }
  }
  div .euiDataGridRowCell__contentByHeight {
    height: auto;
    align-self: center;
  }
  div .euiDataGridRowCell--lastColumn .euiDataGridRowCell__contentByHeight {
    flex-grow: 0;
    width: 100%;
  }
  div .siemEventsTable__trSupplement--summary {
    display: block;
  }
`;

const memoizedGetColumnHeaders: (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields,
  isEventRenderedView: boolean
) => ColumnHeaderOptions[] = memoizeOne(getColumnHeaders);

export const DataTableComponent = React.memo<DataTableProps>(
  ({
    additionalControls,
    browserFields,
    bulkActions = true,
    data,
    disableCellActions = false,
    fieldBrowserOptions,
    hasCrudPermissions,
    id,
    leadingControlColumns,
    loadPage,
    renderCellValue,
    rowRenderers,
    pagination,
    unitCountText,
    totalItems,
    rowHeightsOptions,
    isEventRenderedView = false,
  }) => {
    const {
      triggersActionsUi: { getFieldBrowser },
    } = useKibana().services;
    const getDataTable = dataTableSelectors.getTableByIdSelector();
    const dataTable = useShallowEqualSelector((state) => getDataTable(state, id) ?? tableDefaults);
    const { columns, selectedEventIds, showCheckboxes, sort, isLoading, defaultColumns } =
      dataTable;

    const columnHeaders = memoizedGetColumnHeaders(columns, browserFields, isEventRenderedView);

    const dataGridRef = useRef<EuiDataGridRefProps>(null);

    const dispatch = useDispatch();

    const selectedCount = useMemo(() => Object.keys(selectedEventIds).length, [selectedEventIds]);

    const theme: EuiTheme = useContext(ThemeContext);

    const showBulkActions = useMemo(() => {
      if (!hasCrudPermissions) {
        return false;
      }

      if (selectedCount === 0 || !showCheckboxes) {
        return false;
      }
      if (typeof bulkActions === 'boolean') {
        return bulkActions;
      }
      return (bulkActions?.customBulkActions?.length || bulkActions?.alertStatusActions) ?? true;
    }, [hasCrudPermissions, selectedCount, showCheckboxes, bulkActions]);

    const onResetColumns = useCallback(() => {
      dispatch(dataTableActions.updateColumns({ id, columns: defaultColumns }));
    }, [defaultColumns, dispatch, id]);

    const onToggleColumn = useCallback(
      (columnId: string) => {
        if (columnHeaders.some(({ id: columnHeaderId }) => columnId === columnHeaderId)) {
          dispatch(
            dataTableActions.removeColumn({
              columnId,
              id,
            })
          );
        } else {
          dispatch(
            dataTableActions.upsertColumn({
              column: getColumnHeader(columnId, defaultColumns),
              id,
              index: 1,
            })
          );
        }
      },
      [columnHeaders, dispatch, id, defaultColumns]
    );

    const toolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
      () => ({
        additionalControls: {
          left: {
            append: (
              <>
                {isLoading && <EuiProgress size="xs" position="absolute" color="accent" />}
                <UnitCount data-test-subj="server-side-event-count">{unitCountText}</UnitCount>
                {additionalControls ?? null}
                {!isEventRenderedView ? (
                  getFieldBrowser({
                    browserFields,
                    options: fieldBrowserOptions,
                    columnIds: columnHeaders.map(({ id: columnId }) => columnId),
                    onResetColumns,
                    onToggleColumn,
                  })
                ) : (
                  <></>
                )}
              </>
            ),
          },
        },
        ...(showBulkActions || isEventRenderedView
          ? {
              showColumnSelector: false,
              showSortSelector: false,
              showFullScreenSelector: false,
            }
          : {
              showColumnSelector: { allowHide: false, allowReorder: true },
              showSortSelector: true,
              showFullScreenSelector: true,
            }),
        showDisplaySelector: false,
      }),
      [
        isLoading,
        unitCountText,
        additionalControls,
        isEventRenderedView,
        getFieldBrowser,
        browserFields,
        fieldBrowserOptions,
        columnHeaders,
        onResetColumns,
        onToggleColumn,
        showBulkActions,
      ]
    );

    const sortingColumns: Array<{
      id: string;
      direction: 'asc' | 'desc';
    }> = useMemo(
      () =>
        sort.map((x) => ({
          id: x.columnId,
          direction: mapSortDirectionToDirection(x.sortDirection),
        })),
      [sort]
    );

    const onSort = useCallback(
      (
        nextSortingColumns: Array<{
          id: string;
          direction: 'asc' | 'desc';
        }>
      ) => {
        dispatch(
          dataTableActions.updateSort({
            id,
            sort: mapSortingColumns({ columns: nextSortingColumns, columnHeaders }),
          })
        );

        setTimeout(() => {
          // schedule the query to be re-executed from page 0, (but only after the
          // store has been updated with the new sort):
          if (loadPage != null) {
            loadPage(0);
          }
        }, 0);
      },
      [columnHeaders, dispatch, id, loadPage]
    );

    const visibleColumns = useMemo(() => columnHeaders.map(({ id: cid }) => cid), [columnHeaders]); // the full set of columns

    const onColumnResize = useCallback(
      ({ columnId, width }: { columnId: string; width: number }) => {
        dispatch(
          dataTableActions.updateColumnWidth({
            columnId,
            id,
            width,
          })
        );
      },
      [dispatch, id]
    );

    const onSetVisibleColumns = useCallback(
      (newVisibleColumns: string[]) => {
        dispatch(
          dataTableActions.updateColumnOrder({
            columnIds: newVisibleColumns,
            id,
          })
        );
      },
      [dispatch, id]
    );

    const columnsCellActionsProps = useMemo<UseDataGridColumnsSecurityCellActionsProps>(() => {
      const fields = disableCellActions
        ? []
        : columnHeaders.map((column) => ({
            name: column.id,
            type: column.type ?? 'keyword',
            values: data.map(
              ({ data: columnData }) =>
                columnData.find((rowData) => rowData.field === column.id)?.value
            ),
            aggregatable: column.aggregatable,
          }));

      return {
        triggerId: SecurityCellActionsTrigger.DEFAULT,
        fields,
        metadata: {
          scopeId: id,
        },
        dataGridRef,
      };
    }, [disableCellActions, columnHeaders, data, id]);

    const columnsCellActions = useDataGridColumnsSecurityCellActions(columnsCellActionsProps);

    const columnsWithCellActions: EuiDataGridColumn[] = useMemo(
      () =>
        columnHeaders.map((header, columnIndex) => ({
          ...header,
          actions: {
            ...header.actions,
            additional: [
              {
                iconType: 'cross',
                label: REMOVE_COLUMN,
                onClick: () => {
                  dispatch(dataTableActions.removeColumn({ id, columnId: header.id }));
                },
                size: 'xs',
              },
            ],
          },
          cellActions: columnsCellActions[columnIndex] ?? [],
          visibleCellActions: 3,
        })),
      [columnHeaders, columnsCellActions, dispatch, id]
    );

    const renderTableCellValue = useMemo(() => {
      const Cell: React.FC<EuiDataGridCellValueElementProps> = ({
        columnId,
        rowIndex,
        colIndex,
        setCellProps,
        isDetails,
      }): React.ReactElement | null => {
        const pageRowIndex = getPageRowIndex(rowIndex, pagination.pageSize);
        const rowData = pageRowIndex < data.length ? data[pageRowIndex].data : null;
        const header = columnHeaders.find((h) => h.id === columnId);
        const eventId = pageRowIndex < data.length ? data[pageRowIndex]._id : null;
        const ecs = pageRowIndex < data.length ? data[pageRowIndex].ecs : null;

        useEffect(() => {
          const defaultStyles = { overflow: 'hidden' };
          setCellProps({ style: { ...defaultStyles } });
          if (ecs && rowData) {
            addBuildingBlockStyle(ecs, theme, setCellProps, defaultStyles);
          } else {
            // disable the cell when it has no data
            setCellProps({ style: { display: 'none' } });
          }
        }, [rowIndex, setCellProps, ecs, rowData]);

        if (rowData == null || header == null || eventId == null || ecs === null) {
          return null;
        }

        return renderCellValue({
          asPlainText: false,
          browserFields,
          columnId: header.id,
          data: rowData,
          ecsData: ecs,
          eventId,
          header,
          isDetails,
          isDraggable: false,
          isExpandable: true,
          isExpanded: false,
          linkValues: getOr([], header.linkField ?? '', ecs),
          rowIndex,
          colIndex,
          rowRenderers,
          setCellProps,
          scopeId: id,
          truncate: isDetails ? false : true,
        }) as React.ReactElement;
      };
      return Cell;
    }, [
      browserFields,
      columnHeaders,
      data,
      id,
      pagination.pageSize,
      renderCellValue,
      rowRenderers,
      theme,
    ]);

    return (
      <>
        <EuiDataGridContainer hideLastPage={totalItems > ES_LIMIT_COUNT}>
          <EuiDataGrid
            id={'body-data-grid'}
            data-test-subj="body-data-grid"
            aria-label={DATA_TABLE_ARIA_LABEL}
            columns={isEventRenderedView ? columnHeaders : columnsWithCellActions}
            columnVisibility={{ visibleColumns, setVisibleColumns: onSetVisibleColumns }}
            gridStyle={gridStyle(isEventRenderedView)}
            leadingControlColumns={leadingControlColumns}
            toolbarVisibility={toolbarVisibility}
            rowCount={totalItems}
            renderCellValue={renderTableCellValue}
            sorting={{ columns: sortingColumns, onSort }}
            onColumnResize={onColumnResize}
            pagination={pagination}
            ref={dataGridRef}
            rowHeightsOptions={rowHeightsOptions}
          />
        </EuiDataGridContainer>
      </>
    );
  }
);

DataTableComponent.displayName = 'DataTableComponent';
