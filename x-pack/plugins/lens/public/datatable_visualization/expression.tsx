/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiBasicTable, EuiFlexGroup, EuiButtonIcon, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { IAggType } from 'src/plugins/data/public';
import { FormatFactory, LensMultiTable } from '../types';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions/public';
import { VisualizationContainer } from '../visualization_container';
import { ValueClickTriggerContext } from '../../../../../src/plugins/embeddable/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { getExecuteTriggerActions } from '../services';
export interface DatatableColumns {
  columnIds: string[];
}

interface Args {
  title: string;
  columns: DatatableColumns & { type: 'lens_datatable_columns' };
}

export interface DatatableProps {
  data: LensMultiTable;
  args: Args;
}

type DatatableRenderProps = DatatableProps & {
  formatFactory: FormatFactory;
  executeTriggerActions: UiActionsStart['executeTriggerActions'];
  getType: (name: string) => IAggType;
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
    handlers: IInterpreterRenderHandlers
  ) => {
    const resolvedFormatFactory = await dependencies.formatFactory;
    const executeTriggerActions = getExecuteTriggerActions();
    const resolvedGetType = await dependencies.getType;
    ReactDOM.render(
      <I18nProvider>
        <DatatableComponent
          {...config}
          formatFactory={resolvedFormatFactory}
          executeTriggerActions={executeTriggerActions}
          getType={resolvedGetType}
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

  firstTable.columns.forEach(column => {
    formatters[column.id] = props.formatFactory(column.formatHint);
  });

  const handleFilterClick = (field: string, value: unknown, colIndex: number, negate = false) => {
    const col = firstTable.columns[colIndex];
    const isDateHistogram = col.meta?.type === 'date_histogram';
    const timeFieldName = negate && isDateHistogram ? undefined : col?.meta?.aggConfigParams?.field;
    const rowIndex = firstTable.rows.findIndex(row => row[field] === value);

    const context: ValueClickTriggerContext = {
      data: {
        negate,
        data: [
          {
            row: rowIndex,
            column: colIndex,
            value,
            table: firstTable,
          },
        ],
      },
      timeFieldName,
    };
    props.executeTriggerActions(VIS_EVENT_TO_TRIGGER.filter, context);
  };

  return (
    <VisualizationContainer>
      <EuiBasicTable
        className="lnsDataTable"
        data-test-subj="lnsDataTable"
        tableLayout="auto"
        columns={props.args.columns.columnIds
          .map(field => {
            const col = firstTable.columns.find(c => c.id === field);
            const colIndex = firstTable.columns.findIndex(c => c.id === field);

            const filterable = col?.meta?.type && props.getType(col.meta.type)?.type === 'buckets';
            return {
              field,
              name: (col && col.name) || '',
              render: (value: unknown) => {
                const formattedValue = formatters[field]?.convert(value);
                const fieldName = col?.meta?.aggConfigParams?.field;

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
                                aria-label={i18n.translate(
                                  'xpack.lens.excludeValueButtonAriaLabel',
                                  {
                                    defaultMessage: `Exclude {value}`,
                                    values: {
                                      value: `${
                                        fieldName ? `${fieldName}: ` : ''
                                      }${formattedValue}`,
                                    },
                                  }
                                )}
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
          .filter(({ field }) => !!field)}
        items={firstTable ? firstTable.rows : []}
      />
    </VisualizationContainer>
  );
}
