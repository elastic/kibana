/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './table_basic.scss';

import React, { useCallback, useMemo, useRef, useState, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
import {
  EuiButtonIcon,
  EuiDataGrid,
  EuiDataGridControlColumn,
  EuiDataGridColumn,
  EuiDataGridSorting,
  EuiDataGridStyle,
} from '@elastic/eui';
import { FormatFactory, LensFilterEvent, LensTableRowContextMenuEvent } from '../../types';
import { VisualizationContainer } from '../../visualization_container';
import { EmptyPlaceholder } from '../../shared_components';
import { LensIconChartDatatable } from '../../assets/chart_datatable';
import {
  DataContextType,
  DatatableRenderProps,
  LensSortAction,
  LensResizeAction,
  LensGridDirection,
} from './types';
import { createGridColumns } from './columns';
import { createGridCell } from './cell_value';
import {
  createGridFilterHandler,
  createGridResizeHandler,
  createGridSortingConfig,
} from './table_actions';

const DataContext = React.createContext<DataContextType>({});

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'underline',
};

export const DatatableComponent = (props: DatatableRenderProps) => {
  const [firstTable] = Object.values(props.data.tables);

  const [columnConfig, setColumnConfig] = useState(props.args.columns);
  const [firstLocalTable, updateTable] = useState(firstTable);

  useDeepCompareEffect(() => {
    setColumnConfig(props.args.columns);
  }, [props.args.columns]);

  useDeepCompareEffect(() => {
    updateTable(firstTable);
  }, [firstTable]);

  const firstTableRef = useRef(firstLocalTable);
  firstTableRef.current = firstLocalTable;

  const hasAtLeastOneRowClickAction = props.rowHasRowClickTriggerActions?.some((x) => x);

  const { getType, dispatchEvent, renderMode, formatFactory } = props;

  const formatters: Record<string, ReturnType<FormatFactory>> = useMemo(
    () =>
      firstLocalTable.columns.reduce(
        (map, column) => ({
          ...map,
          [column.id]: formatFactory(column.meta?.params),
        }),
        {}
      ),
    [firstLocalTable, formatFactory]
  );

  const onClickValue = useCallback(
    (data: LensFilterEvent['data']) => {
      dispatchEvent({ name: 'filter', data });
    },
    [dispatchEvent]
  );

  const onEditAction = useCallback(
    (data: LensSortAction['data'] | LensResizeAction['data']) => {
      if (renderMode === 'edit') {
        dispatchEvent({ name: 'edit', data });
      }
    },
    [dispatchEvent, renderMode]
  );
  const onRowContextMenuClick = useCallback(
    (data: LensTableRowContextMenuEvent['data']) => {
      dispatchEvent({ name: 'tableRowContextMenuClick', data });
    },
    [dispatchEvent]
  );

  const handleFilterClick = useMemo(() => createGridFilterHandler(firstTableRef, onClickValue), [
    firstTableRef,
    onClickValue,
  ]);

  const bucketColumns = useMemo(
    () =>
      columnConfig.columnIds.filter((_colId, index) => {
        const col = firstTableRef.current.columns[index];
        return (
          col?.meta?.sourceParams?.type &&
          getType(col.meta.sourceParams.type as string)?.type === 'buckets'
        );
      }),
    [firstTableRef, columnConfig, getType]
  );

  const isEmpty =
    firstLocalTable.rows.length === 0 ||
    (bucketColumns.length &&
      firstTable.rows.every((row) => bucketColumns.every((col) => row[col] == null)));

  const visibleColumns = useMemo(() => columnConfig.columnIds.filter((field) => !!field), [
    columnConfig,
  ]);

  const { sortBy, sortDirection } = columnConfig;

  const isReadOnlySorted = renderMode !== 'edit';

  const onColumnResize = useMemo(
    () => createGridResizeHandler(columnConfig, setColumnConfig, onEditAction),
    [onEditAction, setColumnConfig, columnConfig]
  );

  const columns: EuiDataGridColumn[] = useMemo(
    () =>
      createGridColumns(
        bucketColumns,
        firstLocalTable,
        handleFilterClick,
        isReadOnlySorted,
        columnConfig,
        visibleColumns,
        formatFactory,
        onColumnResize
      ),
    [
      bucketColumns,
      firstLocalTable,
      handleFilterClick,
      isReadOnlySorted,
      columnConfig,
      visibleColumns,
      formatFactory,
      onColumnResize,
    ]
  );

  const trailingControlColumns: EuiDataGridControlColumn[] = useMemo(() => {
    if (!hasAtLeastOneRowClickAction || !onRowContextMenuClick) {
      return [];
    }
    return [
      {
        headerCellRender: () => null,
        width: 40,
        id: 'trailingControlColumn',
        rowCellRender: function RowCellRender({ rowIndex }) {
          const { rowHasRowClickTriggerActions } = useContext(DataContext);
          return (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.lens.table.actionsLabel', {
                defaultMessage: 'Show actions',
              })}
              iconType={
                !!rowHasRowClickTriggerActions && !rowHasRowClickTriggerActions[rowIndex]
                  ? 'empty'
                  : 'boxesVertical'
              }
              color="text"
              onClick={() => {
                onRowContextMenuClick({
                  rowIndex,
                  table: firstTableRef.current,
                  columns: columnConfig.columnIds,
                });
              }}
            />
          );
        },
      },
    ];
  }, [firstTableRef, onRowContextMenuClick, columnConfig, hasAtLeastOneRowClickAction]);

  const renderCellValue = useMemo(() => createGridCell(formatters, DataContext), [formatters]);

  const columnVisibility = useMemo(() => ({ visibleColumns, setVisibleColumns: () => {} }), [
    visibleColumns,
  ]);

  const sorting = useMemo<EuiDataGridSorting>(
    () => createGridSortingConfig(sortBy, sortDirection as LensGridDirection, onEditAction),
    [onEditAction, sortBy, sortDirection]
  );

  if (isEmpty) {
    return <EmptyPlaceholder icon={LensIconChartDatatable} />;
  }

  const dataGridAriaLabel =
    props.args.title ||
    i18n.translate('xpack.lens.table.defaultAriaLabel', {
      defaultMessage: 'Data table visualization',
    });

  return (
    <VisualizationContainer
      className="lnsDataTableContainer"
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
      <DataContext.Provider
        value={{
          table: firstLocalTable,
          rowHasRowClickTriggerActions: props.rowHasRowClickTriggerActions,
        }}
      >
        <EuiDataGrid
          aria-label={dataGridAriaLabel}
          data-test-subj="lnsDataTable"
          columns={columns}
          columnVisibility={columnVisibility}
          trailingControlColumns={trailingControlColumns}
          rowCount={firstLocalTable.rows.length}
          renderCellValue={renderCellValue}
          gridStyle={gridStyle}
          sorting={sorting}
          onColumnResize={onColumnResize}
          toolbarVisibility={false}
        />
      </DataContext.Provider>
    </VisualizationContainer>
  );
};
