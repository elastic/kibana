/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiPopover, EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { DataType, DatasourceDimensionPanelProps } from '../types';
import {
  IndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  OperationType,
} from './indexpattern';

const operations: OperationType[] = ['value', 'terms', 'date_histogram', 'sum', 'average', 'count'];

const operationPanels: Record<
  OperationType,
  {
    type: OperationType;
    displayName: string;
    ofName: (name: string) => string;
  }
> = {
  value: {
    type: 'value',
    displayName: i18n.translate('xpack.lens.indexPatternOperations.value', {
      defaultMessage: 'Value',
    }),
    ofName: name =>
      i18n.translate('xpack.lens.indexPatternOperations.valueOf', {
        defaultMessage: 'Value of {name}',
        values: { name },
      }),
  },
  terms: {
    type: 'terms',
    displayName: i18n.translate('xpack.lens.indexPatternOperations.terms', {
      defaultMessage: 'Top Values',
    }),
    ofName: name =>
      i18n.translate('xpack.lens.indexPatternOperations.termsOf', {
        defaultMessage: 'Top Values of {name}',
        values: { name },
      }),
  },
  date_histogram: {
    type: 'date_histogram',
    displayName: i18n.translate('xpack.lens.indexPatternOperations.dateHistogram', {
      defaultMessage: 'Date Histogram',
    }),
    ofName: name =>
      i18n.translate('xpack.lens.indexPatternOperations.dateHistogramOf', {
        defaultMessage: 'Date Histogram of',
        values: { name },
      }),
  },
  sum: {
    type: 'sum',
    displayName: i18n.translate('xpack.lens.indexPatternOperations.sum', {
      defaultMessage: 'Sum',
    }),
    ofName: name =>
      i18n.translate('xpack.lens.indexPatternOperations.sumOf', {
        defaultMessage: 'Sum of',
        values: { name },
      }),
  },
  average: {
    type: 'average',
    displayName: i18n.translate('xpack.lens.indexPatternOperations.average', {
      defaultMessage: 'Average',
    }),
    ofName: name =>
      i18n.translate('xpack.lens.indexPatternOperations.averageOf', {
        defaultMessage: 'Average of',
        values: { name },
      }),
  },
  count: {
    type: 'count',
    displayName: i18n.translate('xpack.lens.indexPatternOperations.count', {
      defaultMessage: 'Count',
    }),
    ofName: name =>
      i18n.translate('xpack.lens.indexPatternOperations.countOf', {
        defaultMessage: 'Count of',
        values: { name },
      }),
  },
};

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

function getOperationTypesForField({ type }: IndexPatternField): OperationType[] {
  switch (type) {
    case 'date':
      return ['value', 'date_histogram'];
    case 'number':
      return ['value', 'sum', 'average'];
    case 'string':
      return ['value', 'terms'];
  }
  return [];
}

function getOperationResultType({ type }: IndexPatternField, op: OperationType): DataType {
  switch (op) {
    case 'value':
      return type as DataType;
    case 'average':
    case 'count':
    case 'sum':
      return 'number';
    case 'date_histogram':
      return 'date';
    case 'terms':
      return 'string';
  }
}

export function getPotentialColumns(state: IndexPatternPrivateState): IndexPatternColumn[] {
  const fields = state.indexPatterns[state.currentIndexPatternId].fields;

  const columns: IndexPatternColumn[] = fields
    .map((field, index) => {
      const validOperations = getOperationTypesForField(field);

      return validOperations.map(op => ({
        operationId: `${index}${op}`,
        label: operationPanels[op].ofName(field.name),
        dataType: getOperationResultType(field, op),
        isBucketed: op === 'terms' || op === 'date_histogram',

        operationType: op,
        sourceField: field.name,
      }));
    })
    .reduce((prev, current) => prev.concat(current));

  columns.push({
    operationId: 'count',
    label: i18n.translate('xpack.lens.indexPatternOperations.countOfDocuments', {
      defaultMessage: 'Count of Documents',
    }),
    dataType: 'number',
    isBucketed: false,

    operationType: 'count',
    sourceField: 'documents',
  });

  return columns;
}

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const [isOpen, setOpen] = useState(false);

  const columns = getPotentialColumns(props.state);

  const filteredColumns = columns.filter(col => {
    const { operationId, label, dataType, isBucketed } = col;

    return props.filterOperations({
      id: operationId,
      label,
      dataType,
      isBucketed,
    });
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const uniqueColumnsByField = _.uniq(filteredColumns, col => col.sourceField);

  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return col.sourceField === selectedColumn.sourceField;
      })
    : filteredColumns;

  return (
    <div>
      <EuiFlexItem grow={true}>
        <EuiPopover
          id={props.columnId}
          panelClassName="lns-indexPattern-dimensionPopover"
          isOpen={isOpen}
          closePopover={() => {
            setOpen(false);
          }}
          ownFocus
          anchorPosition="rightCenter"
          button={
            <div data-test-subj="indexPattern-dimension">
              <EuiButtonEmpty
                data-test-subj="indexPattern-dimensionPopover-button"
                onClick={() => {
                  setOpen(!isOpen);
                }}
              >
                <span>
                  {selectedColumn
                    ? selectedColumn.label
                    : i18n.translate('xpack.lens.configureDimension', {
                        defaultMessage: 'Configure dimension',
                      })}
                </span>
              </EuiButtonEmpty>
            </div>
          }
        >
          <EuiFlexGroup wrap={true}>
            <EuiFlexItem grow={2}>
              <EuiComboBox
                data-test-subj="indexPattern-dimension-field"
                placeholder="Field"
                options={uniqueColumnsByField.map(col => ({
                  label: col.sourceField,
                  value: col.operationId,
                }))}
                selectedOptions={
                  selectedColumn
                    ? [
                        {
                          label: selectedColumn.sourceField,
                          value: selectedColumn.operationId,
                        },
                      ]
                    : []
                }
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                onChange={choices => {
                  const column: IndexPatternColumn = columns.find(
                    ({ operationId }) => operationId === choices[0].value
                  )!;
                  const newColumns: IndexPatternPrivateState['columns'] = {
                    ...props.state.columns,
                    [props.columnId]: column,
                  };

                  props.setState({
                    ...props.state,
                    columns: newColumns,
                    // Order is not meaningful until we aggregate
                    columnOrder: Object.keys(newColumns),
                  });
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <div>
                {operations.map(o => (
                  <EuiButtonEmpty
                    data-test-subj={`lns-indexPatternDimension-${o}`}
                    key={o}
                    color={
                      selectedColumn && selectedColumn.operationType === o ? 'primary' : 'text'
                    }
                    isDisabled={!functionsFromField.some(col => col.operationType === o)}
                    onClick={() => {
                      if (!selectedColumn) {
                        return;
                      }

                      const newColumn: IndexPatternColumn = filteredColumns.find(
                        col =>
                          col.operationType === o && col.sourceField === selectedColumn.sourceField
                      )!;

                      props.setState({
                        ...props.state,
                        columnOrder: _.uniq(
                          Object.keys(props.state.columns).concat(props.columnId)
                        ),
                        columns: {
                          ...props.state.columns,
                          [props.columnId]: newColumn,
                        },
                      });
                    }}
                  >
                    <span>{operationPanels[o].displayName}</span>
                  </EuiButtonEmpty>
                ))}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopover>
      </EuiFlexItem>
    </div>
  );
}
