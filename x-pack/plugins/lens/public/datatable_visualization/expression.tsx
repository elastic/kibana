/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider, FormattedMessage } from '@kbn/i18n/react';
import { EuiBasicTable, EuiFlexGroup, EuiIconTip, EuiFlexItem, EuiText } from '@elastic/eui';
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
import { Icon } from './filter_icon';

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
  getType: Function;
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
  getType: Promise<Function>;
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

  const handleFilterClick = (field: string, value: unknown, index: number, negate = false) => {
    const timeFieldName = negate
      ? undefined
      : firstTable.columns.find(col => col?.meta?.type === 'date_histogram')?.meta?.aggConfigParams
          ?.field;
    const rowIndex = firstTable.rows.findIndex(row => row[field] === value);

    const context: ValueClickTriggerContext = {
      data: {
        negate,
        data: [
          {
            row: rowIndex,
            column: index,
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
                if (filterable && value) {
                  return (
                    <EuiFlexGroup className="lnsDataTable__cell" gutterSize="xs">
                      <EuiFlexItem grow={false}>{formattedValue}</EuiFlexItem>
                      <EuiFlexItem
                        grow={false}
                        className="lnsDataTable__filter"
                        onClick={({ shiftKey }) =>
                          handleFilterClick(field, value, colIndex, shiftKey ? true : false)
                        }
                        data-test-subj="lensFilterForCellValue"
                      >
                        <EuiIconTip
                          color="primary"
                          type={Icon}
                          title={
                            <EuiText size="s">
                              <FormattedMessage
                                id="xpack.lens.datatable.filter.tooltip.title"
                                defaultMessage="Filter for {value}"
                                values={{
                                  value: <strong>{formattedValue}</strong>,
                                }}
                              />
                            </EuiText>
                          }
                          content={
                            <>
                              <EuiText size="xs">
                                <FormattedMessage
                                  id="xpack.lens.datatable.filter.tooltip.filterFor"
                                  defaultMessage="{click} to filter {for} value."
                                  values={{
                                    click: (
                                      <code>
                                        {i18n.translate(
                                          'xpack.lens.datatable.filter.tooltip.filterFor.click',
                                          {
                                            defaultMessage: 'Click',
                                            description: `Part of 'Click to filter for value'`,
                                          }
                                        )}
                                      </code>
                                    ),
                                    for: (
                                      <strong>
                                        {i18n.translate('xpack.lens.datatable.filter.tooltip.for', {
                                          defaultMessage: 'for',
                                          description: `Part of 'Click to filter for value'`,
                                        })}
                                      </strong>
                                    ),
                                  }}
                                />
                              </EuiText>
                              <EuiText size="xs">
                                <FormattedMessage
                                  id="xpack.lens.datatable.filter.tooltip.filterOut"
                                  defaultMessage="{shiftClick} to filter {out} value"
                                  values={{
                                    shiftClick: (
                                      <code>
                                        {i18n.translate(
                                          'xpack.lens.datatable.filter.tooltip.shiftClick',
                                          {
                                            defaultMessage: 'Shift + click',
                                            description: `Part of 'Shift + click to filter out value'`,
                                          }
                                        )}
                                      </code>
                                    ),
                                    // description:{}
                                    out: (
                                      <strong>
                                        {i18n.translate('xpack.lens.datatable.filter.tooltip.out', {
                                          defaultMessage: 'out',
                                          description: `Part of 'Shift + click to filter out value'`,
                                        })}
                                      </strong>
                                    ),
                                  }}
                                />
                              </EuiText>
                            </>
                          }
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  );
                }
                return formattedValue;
              },
            };
          })
          .filter(({ field }) => !!field)}
        items={firstTable ? firstTable.rows : []}
      />
    </VisualizationContainer>
  );
}
