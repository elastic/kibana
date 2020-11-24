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
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import { IAggType } from 'src/plugins/data/public';
import {
  FormatFactory,
  ILensInterpreterRenderHandlers,
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
import { UiActionsStart, ROW_CLICK_TRIGGER } from '../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';

export interface DatatableColumns {
  columnIds: string[];
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
  onRowContextMenuClick: (data: LensTableRowContextMenuEvent['data']) => void;
  getType: (name: string) => IAggType;

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

export const datatable: ExpressionFunctionDefinition<
  'lens_datatable',
  LensMultiTable,
  Args,
  DatatableRender
> = {
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
  fn(data, args) {
    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

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
  uiActions: UiActionsStart;
  formatFactory: Promise<FormatFactory>;
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
    const resolvedFormatFactory = await dependencies.formatFactory;
    const resolvedGetType = await dependencies.getType;
    const onClickValue = (data: LensFilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onRowContextMenuClick = (data: LensTableRowContextMenuEvent['data']) => {
      handlers.event({ name: 'tableRowContextMenuClick', data });
    };
    const uiActions = dependencies.uiActions;
    const table = Object.values(config.data.tables)[0];
    const rowHasRowClickTriggerActions: boolean[] = !table
      ? []
      : await Promise.all(
          table.rows.map(async (row, rowIndex) => {
            try {
              const actions = await uiActions.getTriggerCompatibleActions(ROW_CLICK_TRIGGER, {
                embeddable: ({} as unknown) as IEmbeddable,
                data: {
                  rowIndex,
                  table,
                },
              });
              return !!actions;
            } catch {
              return false;
            }
          })
        );

    ReactDOM.render(
      <I18nProvider>
        <DatatableComponent
          {...config}
          formatFactory={resolvedFormatFactory}
          onClickValue={onClickValue}
          onRowContextMenuClick={onRowContextMenuClick}
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

export function DatatableComponent(props: DatatableRenderProps) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  firstTable.columns.forEach((column) => {
    formatters[column.id] = props.formatFactory(column.meta?.params);
  });

  const { onClickValue, onRowContextMenuClick } = props;
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

  const tableColumns: Array<EuiBasicTableColumn<unknown>> = props.args.columns.columnIds
    .map((field) => {
      const col = firstTable.columns.find((c) => c.id === field);
      const filterable = bucketColumns.includes(field);
      const colIndex = firstTable.columns.findIndex((c) => c.id === field);
      return {
        field,
        name: (col && col.name) || '',
        render: (value: unknown) => {
          const formattedValue = formatters[field]?.convert(value);
          const fieldName = col?.meta?.field;

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
    })
    .filter(({ field }) => !!field);

  if (!!props.rowHasRowClickTriggerActions) {
    const actions: EuiTableActionsColumnType<unknown> = {
      name: 'Actions',
      actions: [
        {
          name: i18n.translate('xpack.lens.tableRowMore', {
            defaultMessage: 'More',
          }),
          description: i18n.translate('xpack.lens.tableRowMoreDescription', {
            defaultMessage: 'Table row context menu',
          }),
          type: 'icon',
          icon: () => {
            return 'boxesVertical';
          },
          onClick: ({ rowIndex }) => {
            onRowContextMenuClick({
              rowIndex,
              table: firstTable,
              columns: props.args.columns.columnIds,
            });
          },
        },
      ],
    } as EuiTableActionsColumnType<unknown>;
    tableColumns.push(actions);
  }

  return (
    <VisualizationContainer
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
      <EuiBasicTable
        className="lnsDataTable"
        data-test-subj="lnsDataTable"
        tableLayout="auto"
        columns={tableColumns}
        items={firstTable ? firstTable.rows.map((row, rowIndex) => ({ ...row, rowIndex })) : []}
      />
    </VisualizationContainer>
  );
}
