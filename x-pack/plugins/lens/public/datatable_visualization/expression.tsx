/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import { EuiFlexGroup, EuiIconTip, EuiFlexItem } from '@elastic/eui';
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
  filterable: boolean[];
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
    filterable: {
      types: ['boolean'],
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
      <DatatableComponent
        {...config}
        formatFactory={resolvedFormatFactory}
        executeTriggerActions={executeTriggerActions}
        getType={resolvedGetType}
      />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

function DatatableComponent(props: DatatableRenderProps) {
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
                const formattedValue = formatters[field].convert(value);
                if (filterable && value) {
                  return (
                    <EuiFlexGroup justifyContent="spaceBetween" className="lnsDataTable__cell">
                      <EuiFlexItem grow={false}>{formattedValue}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup className="lnsDataTable__filterGroup">
                          <EuiFlexItem
                            className="lnsDataTable__filter"
                            onClick={() => handleFilterClick(field, value, colIndex)}
                            data-test-subj="lensFilterForCellValue"
                          >
                            <EuiIconTip
                              type="magnifyWithPlus"
                              content={i18n.translate(
                                'xpack.lens.tableCellFilter.filterForValueTooltip',
                                {
                                  defaultMessage: 'Filter for value',
                                }
                              )}
                              iconProps={{
                                className: 'eui-alignTop',
                              }}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem
                            className="lnsDataTable__filter"
                            onClick={() => handleFilterClick(field, value, colIndex, true)}
                            data-test-subj="lensFilterOutCellValue"
                          >
                            <EuiIconTip
                              type="magnifyWithMinus"
                              content={i18n.translate(
                                'xpack.lens.tableCellFilter.filterOutValueTooltip',
                                {
                                  defaultMessage: 'Filter out value',
                                }
                              )}
                              iconProps={{
                                className: 'eui-alignTop',
                              }}
                            />
                          </EuiFlexItem>
                        </EuiFlexGroup>
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
