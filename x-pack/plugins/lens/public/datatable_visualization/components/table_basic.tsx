/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import type { LensFilterEvent, LensTableRowContextMenuEvent } from '../../types';
import type { FormatFactory } from '../../../common';
import type { LensGridDirection } from '../../../common/expressions';
import { VisualizationContainer } from '../../visualization_container';
import { EmptyPlaceholder, findMinMaxByColumnId } from '../../shared_components';
import { LensIconChartDatatable } from '../../assets/chart_datatable';
import type {
  DataContextType,
  DatatableRenderProps,
  LensSortAction,
  LensResizeAction,
  LensToggleAction,
} from './types';
import { createGridColumns } from './columns';
import { createGridCell } from './cell_value';
import {
  createGridFilterHandler,
  createGridHideHandler,
  createGridResizeHandler,
  createGridSortingConfig,
  createTransposeColumnFilterHandler,
} from './table_actions';
import { CUSTOM_PALETTE } from '../../shared_components/coloring/constants';
import { getOriginalId, getFinalSummaryConfiguration } from '../../../common/expressions';

export const DataContext = React.createContext<DataContextType>({});

const gridStyle: EuiDataGridStyle = {
  border: 'horizontal',
  header: 'underline',
};

export const DatatableComponent = (props: DatatableRenderProps) => {
  const [firstTable] = Object.values(props.data.tables);

  const [columnConfig, setColumnConfig] = useState({
    columns: props.args.columns,
    sortingColumnId: props.args.sortingColumnId,
    sortingDirection: props.args.sortingDirection,
  });
  const [firstLocalTable, updateTable] = useState(firstTable);

  useDeepCompareEffect(() => {
    setColumnConfig({
      columns: props.args.columns,
      sortingColumnId: props.args.sortingColumnId,
      sortingDirection: props.args.sortingDirection,
    });
  }, [props.args.columns, props.args.sortingColumnId, props.args.sortingDirection]);

  useDeepCompareEffect(() => {
    updateTable(firstTable);
  }, [firstTable]);

  const firstTableRef = useRef(firstLocalTable);
  firstTableRef.current = firstLocalTable;

  const untransposedDataRef = useRef(props.untransposedData);
  untransposedDataRef.current = props.untransposedData;

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
    (data: LensSortAction['data'] | LensResizeAction['data'] | LensToggleAction['data']) => {
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

  const handleFilterClick = useMemo(
    () => createGridFilterHandler(firstTableRef, onClickValue),
    [firstTableRef, onClickValue]
  );

  const handleTransposedColumnClick = useMemo(
    () => createTransposeColumnFilterHandler(onClickValue, untransposedDataRef),
    [onClickValue, untransposedDataRef]
  );

  const bucketColumns = useMemo(
    () =>
      columnConfig.columns
        .filter((_col, index) => {
          const col = firstTableRef.current.columns[index];
          return (
            col?.meta?.sourceParams?.type &&
            getType(col.meta.sourceParams.type as string)?.type === 'buckets'
          );
        })
        .map((col) => col.columnId),
    [firstTableRef, columnConfig, getType]
  );

  const isEmpty =
    firstLocalTable.rows.length === 0 ||
    (bucketColumns.length &&
      firstTable.rows.every((row) => bucketColumns.every((col) => row[col] == null)));

  const visibleColumns = useMemo(
    () =>
      columnConfig.columns
        .filter((col) => !!col.columnId && !col.hidden)
        .map((col) => col.columnId),
    [columnConfig]
  );

  const { sortingColumnId: sortBy, sortingDirection: sortDirection } = props.args;

  const isReadOnlySorted = renderMode !== 'edit';

  const onColumnResize = useMemo(
    () => createGridResizeHandler(columnConfig, setColumnConfig, onEditAction),
    [onEditAction, setColumnConfig, columnConfig]
  );

  const onColumnHide = useMemo(
    () => createGridHideHandler(columnConfig, setColumnConfig, onEditAction),
    [onEditAction, setColumnConfig, columnConfig]
  );

  const isNumericMap: Record<string, boolean> = useMemo(() => {
    const numericMap: Record<string, boolean> = {};
    for (const column of firstLocalTable.columns) {
      numericMap[column.id] = column.meta.type === 'number';
    }
    return numericMap;
  }, [firstLocalTable]);

  const alignments: Record<string, 'left' | 'right' | 'center'> = useMemo(() => {
    const alignmentMap: Record<string, 'left' | 'right' | 'center'> = {};
    columnConfig.columns.forEach((column) => {
      if (column.alignment) {
        alignmentMap[column.columnId] = column.alignment;
      } else {
        alignmentMap[column.columnId] = isNumericMap[column.columnId] ? 'right' : 'left';
      }
    });
    return alignmentMap;
  }, [columnConfig, isNumericMap]);

  const minMaxByColumnId: Record<string, { min: number; max: number }> = useMemo(() => {
    return findMinMaxByColumnId(
      columnConfig.columns
        .filter(({ columnId }) => isNumericMap[columnId])
        .map(({ columnId }) => columnId),
      firstTable,
      getOriginalId
    );
  }, [firstTable, isNumericMap, columnConfig]);

  const columns: EuiDataGridColumn[] = useMemo(
    () =>
      createGridColumns(
        bucketColumns,
        firstLocalTable,
        handleFilterClick,
        handleTransposedColumnClick,
        isReadOnlySorted,
        columnConfig,
        visibleColumns,
        formatFactory,
        onColumnResize,
        onColumnHide,
        alignments
      ),
    [
      bucketColumns,
      firstLocalTable,
      handleFilterClick,
      handleTransposedColumnClick,
      isReadOnlySorted,
      columnConfig,
      visibleColumns,
      formatFactory,
      onColumnResize,
      onColumnHide,
      alignments,
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
                  columns: columnConfig.columns.map((col) => col.columnId),
                });
              }}
            />
          );
        },
      },
    ];
  }, [firstTableRef, onRowContextMenuClick, columnConfig, hasAtLeastOneRowClickAction]);

  const renderCellValue = useMemo(
    () => createGridCell(formatters, columnConfig, DataContext, props.uiSettings),
    [formatters, columnConfig, props.uiSettings]
  );

  const columnVisibility = useMemo(
    () => ({
      visibleColumns,
      setVisibleColumns: () => {},
    }),
    [visibleColumns]
  );

  const sorting = useMemo<EuiDataGridSorting>(
    () => createGridSortingConfig(sortBy, sortDirection as LensGridDirection, onEditAction),
    [onEditAction, sortBy, sortDirection]
  );

  const renderSummaryRow = useMemo(() => {
    const columnsWithSummary = columnConfig.columns
      .filter((col) => !!col.columnId && !col.hidden)
      .map((config) => ({
        columnId: config.columnId,
        summaryRowValue: config.summaryRowValue,
        ...getFinalSummaryConfiguration(config.columnId, config, firstTable),
      }))
      .filter(({ summaryRow }) => summaryRow !== 'none');

    if (columnsWithSummary.length) {
      const summaryLookup = Object.fromEntries(
        columnsWithSummary.map(({ summaryRowValue, summaryLabel, columnId }) => [
          columnId,
          summaryLabel === '' ? `${summaryRowValue}` : `${summaryLabel}: ${summaryRowValue}`,
        ])
      );
      return ({ columnId }: { columnId: string }) => {
        const currentAlignment = alignments && alignments[columnId];
        const alignmentClassName = `lnsTableCell--${currentAlignment}`;
        const columnName =
          columns.find(({ id }) => id === columnId)?.displayAsText?.replace(/ /g, '-') || columnId;
        return summaryLookup[columnId] != null ? (
          <div
            className={`lnsTableCell ${alignmentClassName}`}
            data-test-subj={`lnsDataTable-footer-${columnName}`}
          >
            {summaryLookup[columnId]}
          </div>
        ) : null;
      };
    }
  }, [columnConfig.columns, alignments, firstTable, columns]);

  if (isEmpty) {
    return (
      <VisualizationContainer
        className="lnsDataTableContainer"
        reportTitle={props.args.title}
        reportDescription={props.args.description}
      >
        <EmptyPlaceholder icon={LensIconChartDatatable} />
      </VisualizationContainer>
    );
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
          alignments,
          minMaxByColumnId,
          getColorForValue: props.paletteService.get(CUSTOM_PALETTE).getColorForValue!,
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
          renderFooterCellValue={renderSummaryRow}
        />
      </DataContext.Provider>
    </VisualizationContainer>
  );
};
