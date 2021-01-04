/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './expression.scss';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiButtonIcon, Direction } from '@elastic/eui';
import { orderBy } from 'lodash';
import { IAggType } from 'src/plugins/data/public';
import { DatatableColumnMeta, RenderMode } from 'src/plugins/expressions';
import { EuiDataGrid } from '@elastic/eui';
import { EuiDataGridControlColumn } from '@elastic/eui';
import { EuiDataGridColumn } from '@elastic/eui';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';
import {
  FormatFactory,
  ILensInterpreterRenderHandlers,
  LensEditEvent,
  LensFilterEvent,
  LensMultiTable,
  LensTableRowContextMenuEvent,
} from '../types';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
} from '../../../../../src/plugins/expressions/public';
import { VisualizationContainer } from '../visualization_container';
import { EmptyPlaceholder } from '../shared_components';
import { desanitizeFilterContext } from '../utils';
import { LensIconChartDatatable } from '../assets/chart_datatable';

export const LENS_EDIT_SORT_ACTION = 'sort';
export const LENS_EDIT_RESIZE_ACTION = 'resize';

export interface LensSortActionData {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface LensResizeActionData {
  columnId: string;
  width: number;
}

type LensSortAction = LensEditEvent<typeof LENS_EDIT_SORT_ACTION>;
type LensResizeAction = LensEditEvent<typeof LENS_EDIT_RESIZE_ACTION>;

export interface DatatableColumns {
  columnIds: string[];
  sortBy: string;
  sortDirection: string;
  columnWidth?: DatatableColumnWidthResult[];
}

export interface DatatableColumnWidth {
  columnId: string;
  width: number;
}

type DatatableColumnWidthResult = DatatableColumnWidth & { type: 'lens_datatable_column_width' };

interface Args {
  title: string;
  description?: string;
  columns: DatatableColumns & { type: 'lens_datatable_columns' };
}

export interface DatatableProps {
  data: LensMultiTable;
  args: Args;
}

type DatatableRenderProps = DatatableProps & {
  formatFactory: FormatFactory;
  dispatchEvent: ILensInterpreterRenderHandlers['event'];
  getType: (name: string) => IAggType;
  renderMode: RenderMode;

  /**
   * A boolean for each table row, which is true if the row active
   * ROW_CLICK_TRIGGER actions attached to it, otherwise false.
   */
  rowHasRowClickTriggerActions?: boolean[];
};

export interface DatatableRender {
  type: 'render';
  as: 'lens_datatable_renderer';
  value: DatatableProps;
}

export const getDatatable = ({
  formatFactory,
}: {
  formatFactory: FormatFactory;
}): ExpressionFunctionDefinition<'lens_datatable', LensMultiTable, Args, DatatableRender> => ({
  name: 'lens_datatable',
  type: 'render',
  inputTypes: ['lens_multitable'],
  help: i18n.translate('xpack.lens.datatable.expressionHelpLabel', {
    defaultMessage: 'Datatable renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.datatable.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    description: {
      types: ['string'],
      help: '',
    },
    columns: {
      types: ['lens_datatable_columns'],
      help: '',
    },
  },
  fn(data, args, context) {
    // do the sorting at this level to propagate it also at CSV download
    const [firstTable] = Object.values(data.tables);
    const [layerId] = Object.keys(context.inspectorAdapters.tables || {});
    const formatters: Record<string, ReturnType<FormatFactory>> = {};

    firstTable.columns.forEach((column) => {
      formatters[column.id] = formatFactory(column.meta?.params);
    });
    const { sortBy, sortDirection } = args.columns;

    const columnsReverseLookup = firstTable.columns.reduce<
      Record<string, { name: string; index: number; meta?: DatatableColumnMeta }>
    >((memo, { id, name, meta }, i) => {
      memo[id] = { name, index: i, meta };
      return memo;
    }, {});

    if (sortBy && sortDirection !== 'none') {
      // Sort on raw values for these types, while use the formatted value for the rest
      const sortingCriteria = ['number', 'date'].includes(
        columnsReverseLookup[sortBy]?.meta?.type || ''
      )
        ? sortBy
        : (row: Record<string, unknown>) => formatters[sortBy]?.convert(row[sortBy]);
      // replace the table here
      context.inspectorAdapters.tables[layerId].rows = orderBy(
        firstTable.rows || [],
        [sortingCriteria],
        sortDirection as Direction
      );
      // replace also the local copy
      firstTable.rows = context.inspectorAdapters.tables[layerId].rows;
    }
    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data,
        args,
      },
    };
  },
});

type DatatableColumnsResult = DatatableColumns & { type: 'lens_datatable_columns' };

export const datatableColumns: ExpressionFunctionDefinition<
  'lens_datatable_columns',
  null,
  DatatableColumns,
  DatatableColumnsResult
> = {
  name: 'lens_datatable_columns',
  aliases: [],
  type: 'lens_datatable_columns',
  help: '',
  inputTypes: ['null'],
  args: {
    sortBy: { types: ['string'], help: '' },
    sortDirection: { types: ['string'], help: '' },
    columnIds: {
      types: ['string'],
      multi: true,
      help: '',
    },
    columnWidth: {
      types: ['lens_datatable_column_width'],
      multi: true,
      help: '',
    },
  },
  fn: function fn(input: unknown, args: DatatableColumns) {
    return {
      type: 'lens_datatable_columns',
      ...args,
    };
  },
};

export const datatableColumnWidth: ExpressionFunctionDefinition<
  'lens_datatable_column_width',
  null,
  DatatableColumnWidth,
  DatatableColumnWidthResult
> = {
  name: 'lens_datatable_column_width',
  aliases: [],
  type: 'lens_datatable_column_width',
  help: '',
  inputTypes: ['null'],
  args: {
    columnId: {
      types: ['string'],
      help: '',
    },
    width: {
      types: ['number'],
      help: '',
    },
  },
  fn: function fn(input: unknown, args: DatatableColumnWidth) {
    return {
      type: 'lens_datatable_column_width',
      ...args,
    };
  },
};

export const getDatatableRenderer = (dependencies: {
  formatFactory: FormatFactory;
  getType: Promise<(name: string) => IAggType>;
}): ExpressionRenderDefinition<DatatableProps> => ({
  name: 'lens_datatable_renderer',
  displayName: i18n.translate('xpack.lens.datatable.visualizationName', {
    defaultMessage: 'Datatable',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: DatatableProps,
    handlers: ILensInterpreterRenderHandlers
  ) => {
    const resolvedGetType = await dependencies.getType;
    const { hasCompatibleActions } = handlers;

    // An entry for each table row, whether it has any actions attached to
    // ROW_CLICK_TRIGGER trigger.
    let rowHasRowClickTriggerActions: boolean[] = [];
    if (hasCompatibleActions) {
      const table = Object.values(config.data.tables)[0];
      if (!!table) {
        rowHasRowClickTriggerActions = await Promise.all(
          table.rows.map(async (row, rowIndex) => {
            try {
              const hasActions = await hasCompatibleActions({
                name: 'tableRowContextMenuClick',
                data: {
                  rowIndex,
                  table,
                  columns: config.args.columns.columnIds,
                },
              });

              return hasActions;
            } catch {
              return false;
            }
          })
        );
      }
    }

    ReactDOM.render(
      <I18nProvider>
        <DatatableComponent
          {...config}
          formatFactory={dependencies.formatFactory}
          dispatchEvent={handlers.event}
          renderMode={handlers.getRenderMode()}
          getType={resolvedGetType}
          rowHasRowClickTriggerActions={rowHasRowClickTriggerActions}
        />
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

function getNextOrderValue(currentValue: LensSortAction['data']['direction']) {
  const states: Array<LensSortAction['data']['direction']> = ['asc', 'desc', 'none'];
  const newStateIndex = (1 + states.findIndex((state) => state === currentValue)) % states.length;
  return states[newStateIndex];
}

export function DatatableComponent(props: DatatableRenderProps) {
  const [columnConfig, setColumnConfig] = useState(props.args.columns);

  useDeepCompareEffect(() => {
    setColumnConfig(props.args.columns);
  }, [props.args.columns]);
  const [firstTable] = Object.values(props.data.tables);

  const firstTableRef = useRef(firstTable);
  firstTableRef.current = firstTable;

  const formatFactory = props.formatFactory;
  const formatters: Record<
    string,
    ReturnType<FormatFactory>
  > = firstTableRef.current.columns.reduce(
    (map, column) => ({
      ...map,
      [column.id]: formatFactory(column.meta?.params),
    }),
    {}
  );
  const { getType, dispatchEvent, renderMode, rowHasRowClickTriggerActions } = props;
  const onClickValue = useCallback(
    (data: LensFilterEvent['data']) => {
      dispatchEvent({ name: 'filter', data });
    },
    [dispatchEvent]
  );
  const hasAtLeastOneRowClickAction = rowHasRowClickTriggerActions?.find((x) => x);

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

  const handleFilterClick = useMemo(
    () => (field: string, value: unknown, colIndex: number, negate: boolean = false) => {
      const col = firstTableRef.current.columns[colIndex];
      const isDate = col.meta?.type === 'date';
      const timeFieldName = negate && isDate ? undefined : col?.meta?.field;
      const rowIndex = firstTableRef.current.rows.findIndex((row) => row[field] === value);

      const data: LensFilterEvent['data'] = {
        negate,
        data: [
          {
            row: rowIndex,
            column: colIndex,
            value,
            table: firstTableRef.current,
          },
        ],
        timeFieldName,
      };
      onClickValue(desanitizeFilterContext(data));
    },
    [firstTableRef, onClickValue]
  );

  const bucketColumns = useMemo(
    () =>
      firstTableRef.current.columns
        .filter((col) => {
          return (
            col?.meta?.sourceParams?.type &&
            getType(col.meta.sourceParams.type as string)?.type === 'buckets'
          );
        })
        .map((col) => col.id),
    [firstTableRef, getType]
  );

  const isEmpty =
    firstTable.rows.length === 0 ||
    (bucketColumns.length &&
      firstTable.rows.every((row) =>
        bucketColumns.every((col) => typeof row[col] === 'undefined')
      ));

  const visibleColumns = useMemo(() => columnConfig.columnIds.filter((field) => !!field), [
    columnConfig,
  ]);

  const { sortBy, sortDirection } = columnConfig;

  const isReadOnlySorted = props.renderMode !== 'edit';

  // todo memoize this
  const columns: EuiDataGridColumn[] = useMemo(() => {
    const columnsReverseLookup = firstTableRef.current.columns.reduce<
      Record<string, { name: string; index: number; meta?: DatatableColumnMeta }>
    >((memo, { id, name, meta }, i) => {
      memo[id] = { name, index: i, meta };
      return memo;
    }, {});

    return visibleColumns.map((field) => {
      const filterable = bucketColumns.includes(field);
      const { name, index: colIndex } = columnsReverseLookup[field];

      const cellActions = filterable
        ? [
            ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
              const rowValue = firstTableRef.current.rows[rowIndex][columnId];
              const column = firstTableRef.current.columns.find(({ id }) => id === columnId);
              const contentsIsDefined = rowValue !== null && rowValue !== undefined;

              const cellContent = formatFactory(column?.meta?.params).convert(rowValue);

              const filterForText = i18n.translate(
                'xpack.lens.table.tableCellFilter.filterForValueText',
                {
                  defaultMessage: 'Filter for value',
                }
              );
              const filterForAriaLabel = i18n.translate(
                'spack.lens.table.tableCellFilter.filterForValueAriaLabel',
                {
                  defaultMessage: 'Filter for value: {cellContent}',
                  values: {
                    cellContent,
                  },
                }
              );

              return (
                contentsIsDefined && (
                  <Component
                    aria-label={filterForAriaLabel}
                    data-test-subj="lnsTableCell__filterForCellValue"
                    onClick={() => {
                      handleFilterClick(field, rowValue, colIndex);
                      closePopover();
                    }}
                    iconType="plusInCircle"
                  >
                    {filterForText}
                  </Component>
                )
              );
            },
            ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
              const rowValue = firstTableRef.current.rows[rowIndex][columnId];
              const column = firstTableRef.current.columns.find(({ id }) => id === columnId);
              const contentsIsDefined = rowValue !== null && rowValue !== undefined;
              const cellContent = formatFactory(column?.meta?.params).convert(rowValue);

              const filterOutText = i18n.translate(
                'xpack.lens.tableCellFilter.filterOutValueText',
                {
                  defaultMessage: 'Filter out value',
                }
              );
              const filterOutAriaLabel = i18n.translate(
                'xpack.lens.tableCellFilter.filterOutValueAriaLabel',
                {
                  defaultMessage: 'Filter out value: {cellContent}',
                  values: {
                    cellContent,
                  },
                }
              );

              return (
                contentsIsDefined && (
                  <Component
                    aria-label={filterOutAriaLabel}
                    onClick={() => {
                      handleFilterClick(field, rowValue, colIndex, true);
                      closePopover();
                    }}
                    iconType="minusInCircle"
                  >
                    {filterOutText}
                  </Component>
                )
              );
            },
          ]
        : undefined;

      const columnDefinition: EuiDataGridColumn = {
        id: field,
        cellActions,
        display: name,
        displayAsText: name,
        actions: {
          showHide: false,
          showMoveLeft: false,
          showMoveRight: false,
          showSortAsc: isReadOnlySorted
            ? false
            : {
                label: i18n.translate('visTypeTable.sort.ascLabel', {
                  defaultMessage: 'Sort asc',
                }),
              },
          showSortDesc: isReadOnlySorted
            ? false
            : {
                label: i18n.translate('visTypeTable.sort.descLabel', {
                  defaultMessage: 'Sort desc',
                }),
              },
        },
      };

      const initialWidth = columnConfig.columnWidth?.find(({ columnId }) => columnId === field)
        ?.width;
      if (initialWidth) {
        columnDefinition.initialWidth = initialWidth;
      }

      return columnDefinition;
    });
  }, [
    bucketColumns,
    firstTableRef,
    handleFilterClick,
    isReadOnlySorted,
    columnConfig,
    visibleColumns,
    formatFactory,
  ]);

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
          return (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.lens.datatable.actionsLabel', {
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
  }, [
    firstTableRef,
    onRowContextMenuClick,
    columnConfig,
    hasAtLeastOneRowClickAction,
    rowHasRowClickTriggerActions,
  ]);

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
      const rowValue = firstTableRef.current.rows[rowIndex][columnId];
      const content = formatters[columnId].convert(rowValue, 'html');

      const cellContent = (
        <div
          /*
           * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
           * which is produced in a safe way.
           */
          dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
          data-test-subj="lnsTableCellContent"
          className="lnsDataTableCellContent"
        />
      );

      return cellContent;
    },
    [formatters, firstTableRef]
  );

  const onColumnResize = useCallback(
    (eventData) => {
      // directly set the local state of the component to make sure the visualization re-renders immediately,
      // re-layouting and taking up all of the available space.
      setColumnConfig({
        ...columnConfig,
        columnWidth: [
          ...(columnConfig.columnWidth || []).filter(
            ({ columnId }) => columnId !== eventData.columnId
          ),
          {
            columnId: eventData.columnId,
            width: eventData.width,
            type: 'lens_datatable_column_width',
          },
        ],
      });
      if (onEditAction) {
        return onEditAction({
          action: 'resize',
          columnId: eventData.columnId,
          width: eventData.width,
        });
      }
    },
    [onEditAction, setColumnConfig, columnConfig]
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
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
      <EuiDataGrid
        aria-label={dataGridAriaLabel}
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns: () => {} }}
        trailingControlColumns={trailingControlColumns}
        rowCount={firstTable.rows.length}
        renderCellValue={renderCellValue}
        gridStyle={{
          border: 'horizontal',
          header: 'underline',
        }}
        sorting={{
          columns:
            !sortBy || sortDirection === 'none'
              ? []
              : [
                  {
                    id: sortBy,
                    direction: sortDirection as 'asc' | 'desc',
                  },
                ],
          onSort: (sortingCols) => {
            if (onEditAction) {
              const newSortValue:
                | {
                    id: string;
                    direction: 'desc' | 'asc';
                  }
                | undefined = sortingCols.length <= 1 ? sortingCols[0] : sortingCols[1];
              const isNewColumn = sortBy !== (newSortValue?.id || '');
              // unfortunately the neutral state is not propagated and we need to manually handle it
              const nextDirection = getNextOrderValue(
                (isNewColumn ? 'none' : sortDirection) as LensSortAction['data']['direction']
              );
              return onEditAction({
                action: 'sort',
                columnId: nextDirection !== 'none' || isNewColumn ? newSortValue?.id : undefined,
                direction: nextDirection,
              });
            }
          },
        }}
        onColumnResize={onColumnResize}
        toolbarVisibility={false}
      />
    </VisualizationContainer>
  );
}
