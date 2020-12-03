/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './expression.scss';

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiFlexItem,
  EuiToolTip,
  Direction,
  EuiScreenReaderOnly,
  EuiIcon,
} from '@elastic/eui';
import { orderBy } from 'lodash';
import { IAggType } from 'src/plugins/data/public';
import { DatatableColumnMeta, RenderMode } from 'src/plugins/expressions';
import {
  FormatFactory,
  ILensInterpreterRenderHandlers,
  LensEditEvent,
  LensFilterEvent,
  LensMultiTable,
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

export interface LensSortActionData {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

type LensSortAction = LensEditEvent<typeof LENS_EDIT_SORT_ACTION>;

export interface DatatableColumns {
  columnIds: string[];
  sortBy: string;
  sortDirection: string;
}

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
  onClickValue: (data: LensFilterEvent['data']) => void;
  onEditAction?: (data: LensSortAction['data']) => void;
  getType: (name: string) => IAggType;
  renderMode: RenderMode;
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
        : (row: Record<string, unknown>) =>
            possiblyWrapFormat(
              formatters[sortBy]?.convert(row[sortBy]),
              columnsReverseLookup[sortBy]?.meta?.type
            );
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
  },
  fn: function fn(input: unknown, args: DatatableColumns) {
    return {
      type: 'lens_datatable_columns',
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
    const onClickValue = (data: LensFilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };

    const onEditAction = (data: LensSortAction['data']) => {
      if (handlers.getRenderMode() === 'edit') {
        handlers.event({ name: 'edit', data });
      }
    };
    ReactDOM.render(
      <I18nProvider>
        <DatatableComponent
          {...config}
          formatFactory={dependencies.formatFactory}
          onClickValue={onClickValue}
          onEditAction={onEditAction}
          getType={resolvedGetType}
          renderMode={handlers.getRenderMode()}
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

function possiblyWrapFormat(rowFormatted: string, type: string | undefined) {
  if (type !== 'ip') {
    return rowFormatted;
  }
  // Note this supports only IPv4: maybe there already a solution to support IPv6 and more?
  return Number(
    rowFormatted
      .split('.')
      .map((n) => `000${n}`.slice(-3))
      .join('')
  );
}

function getNextOrderValue(currentValue: LensSortAction['data']['direction']) {
  const states: Array<LensSortAction['data']['direction']> = ['asc', 'desc', 'none'];
  const newStateIndex = (1 + states.findIndex((state) => state === currentValue)) % states.length;
  return states[newStateIndex];
}

function getDirectionLongLabel(sortDirection: LensSortAction['data']['direction']) {
  if (sortDirection === 'none') {
    return sortDirection;
  }
  return sortDirection === 'asc' ? 'ascending' : 'descending';
}

function getHeaderSortingCell(
  name: string,
  columnId: string,
  sorting: Omit<LensSortAction['data'], 'action'>,
  sortingLabel: string
) {
  if (columnId !== sorting.columnId || sorting.direction === 'none') {
    return name || '';
  }
  // This is a workaround to hijack the title value of the header cell
  return (
    <span aria-sort={getDirectionLongLabel(sorting.direction)}>
      {name || ''}
      <EuiScreenReaderOnly>
        <span>{sortingLabel}</span>
      </EuiScreenReaderOnly>
      <EuiIcon
        className="euiTableSortIcon"
        type={sorting.direction === 'asc' ? 'sortUp' : 'sortDown'}
        size="m"
        aria-label={sortingLabel}
      />
    </span>
  );
}

export function DatatableComponent(props: DatatableRenderProps) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  firstTable.columns.forEach((column) => {
    formatters[column.id] = props.formatFactory(column.meta?.params);
  });

  const { onClickValue, onEditAction } = props;
  const handleFilterClick = useMemo(
    () => (field: string, value: unknown, colIndex: number, negate: boolean = false) => {
      const col = firstTable.columns[colIndex];
      const isDate = col.meta?.type === 'date';
      const timeFieldName = negate && isDate ? undefined : col?.meta?.field;
      const rowIndex = firstTable.rows.findIndex((row) => row[field] === value);

      const data: LensFilterEvent['data'] = {
        negate,
        data: [
          {
            row: rowIndex,
            column: colIndex,
            value,
            table: firstTable,
          },
        ],
        timeFieldName,
      };
      onClickValue(desanitizeFilterContext(data));
    },
    [firstTable, onClickValue]
  );

  const bucketColumns = firstTable.columns
    .filter((col) => {
      return (
        col?.meta?.sourceParams?.type &&
        props.getType(col.meta.sourceParams.type as string)?.type === 'buckets'
      );
    })
    .map((col) => col.id);

  const isEmpty =
    firstTable.rows.length === 0 ||
    (bucketColumns.length &&
      firstTable.rows.every((row) =>
        bucketColumns.every((col) => typeof row[col] === 'undefined')
      ));

  if (isEmpty) {
    return <EmptyPlaceholder icon={LensIconChartDatatable} />;
  }

  const visibleColumns = props.args.columns.columnIds.filter((field) => !!field);
  const columnsReverseLookup = firstTable.columns.reduce<
    Record<string, { name: string; index: number; meta?: DatatableColumnMeta }>
  >((memo, { id, name, meta }, i) => {
    memo[id] = { name, index: i, meta };
    return memo;
  }, {});

  const { sortBy, sortDirection } = props.args.columns;

  const sortedRows = firstTable?.rows || [];
  const isReadOnlySorted = props.renderMode !== 'edit';

  const sortedInLabel = i18n.translate('xpack.lens.datatableSortedInReadOnlyMode', {
    defaultMessage: 'Sorted in {sortValue} order',
    values: {
      sortValue: sortDirection === 'asc' ? 'ascending' : 'descending',
    },
  });

  return (
    <VisualizationContainer
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
      <EuiBasicTable
        className="lnsDataTable"
        data-test-subj="lnsDataTable"
        tableLayout="auto"
        sorting={{
          sort:
            !sortBy || sortDirection === 'none' || isReadOnlySorted
              ? undefined
              : {
                  field: sortBy,
                  direction: sortDirection as Direction,
                },
          allowNeutralSort: true, // this flag enables the 3rd Neutral state on the column header
        }}
        onChange={(event: { sort?: { field: string } }) => {
          if (event.sort && onEditAction) {
            const isNewColumn = sortBy !== event.sort.field;
            // unfortunately the neutral state is not propagated and we need to manually handle it
            const nextDirection = getNextOrderValue(
              (isNewColumn ? 'none' : sortDirection) as LensSortAction['data']['direction']
            );
            return onEditAction({
              action: 'sort',
              columnId: nextDirection !== 'none' || isNewColumn ? event.sort.field : undefined,
              direction: nextDirection,
            });
          }
        }}
        columns={visibleColumns.map((field) => {
          const filterable = bucketColumns.includes(field);
          const { name, index: colIndex, meta } = columnsReverseLookup[field];
          const fieldName = meta?.field;
          const nameContent = !isReadOnlySorted
            ? name
            : getHeaderSortingCell(
                name,
                field,
                {
                  columnId: sortBy,
                  direction: sortDirection as LensSortAction['data']['direction'],
                },
                sortedInLabel
              );
          return {
            field,
            name: nameContent,
            sortable: !isReadOnlySorted,
            render: (value: unknown) => {
              const formattedValue = formatters[field]?.convert(value);

              if (filterable) {
                return (
                  <EuiFlexGroup
                    className="lnsDataTable__cell"
                    data-test-subj="lnsDataTableCellValueFilterable"
                    gutterSize="xs"
                  >
                    <EuiFlexItem grow={false}>{formattedValue}</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup
                        responsive={false}
                        gutterSize="none"
                        alignItems="center"
                        className="lnsDataTable__filter"
                      >
                        <EuiToolTip
                          position="bottom"
                          content={i18n.translate('xpack.lens.includeValueButtonTooltip', {
                            defaultMessage: 'Include value',
                          })}
                        >
                          <EuiButtonIcon
                            iconType="plusInCircle"
                            color="text"
                            aria-label={i18n.translate('xpack.lens.includeValueButtonAriaLabel', {
                              defaultMessage: `Include {value}`,
                              values: {
                                value: `${fieldName ? `${fieldName}: ` : ''}${formattedValue}`,
                              },
                            })}
                            data-test-subj="lensDatatableFilterFor"
                            onClick={() => handleFilterClick(field, value, colIndex)}
                          />
                        </EuiToolTip>
                        <EuiFlexItem grow={false}>
                          <EuiToolTip
                            position="bottom"
                            content={i18n.translate('xpack.lens.excludeValueButtonTooltip', {
                              defaultMessage: 'Exclude value',
                            })}
                          >
                            <EuiButtonIcon
                              iconType="minusInCircle"
                              color="text"
                              aria-label={i18n.translate('xpack.lens.excludeValueButtonAriaLabel', {
                                defaultMessage: `Exclude {value}`,
                                values: {
                                  value: `${fieldName ? `${fieldName}: ` : ''}${formattedValue}`,
                                },
                              })}
                              data-test-subj="lensDatatableFilterOut"
                              onClick={() => handleFilterClick(field, value, colIndex, true)}
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                );
              }
              return <span data-test-subj="lnsDataTableCellValue">{formattedValue}</span>;
            },
          };
        })}
        items={sortedRows}
      />
    </VisualizationContainer>
  );
}
