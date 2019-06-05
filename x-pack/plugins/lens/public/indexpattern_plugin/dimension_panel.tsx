/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiPopover,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { DatasourceDimensionPanelProps, DimensionPriority } from '../types';
import { IndexPatternColumn, IndexPatternPrivateState, columnToOperation } from './indexpattern';

import {
  getOperationDisplay,
  getOperations,
  getOperationTypesForField,
  getOperationResultType,
} from './operations';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

export function getPotentialColumns(
  state: IndexPatternPrivateState,
  suggestedOrder?: DimensionPriority
): IndexPatternColumn[] {
  const fields = state.indexPatterns[state.currentIndexPatternId].fields;

  const operationPanels = getOperationDisplay();

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
        suggestedOrder,
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
    suggestedOrder,
  });

  return columns;
}

export function getColumnOrder(columns: Record<string, IndexPatternColumn>): string[] {
  const entries = Object.entries(columns);

  const [aggregations, metrics] = _.partition(entries, col => col[1].isBucketed);

  return aggregations
    .sort(([id, col], [id2, col2]) => {
      return (
        // Sort undefined orders last
        (col.suggestedOrder !== undefined ? col.suggestedOrder : 3) -
        (col2.suggestedOrder !== undefined ? col2.suggestedOrder : 3)
      );
    })
    .map(([id]) => id)
    .concat(metrics.map(([id]) => id));
}

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const [isOpen, setOpen] = useState(false);

  const operations = getOperations();
  const operationPanels = getOperationDisplay();

  const columns = getPotentialColumns(props.state, props.suggestedPriority);

  const filteredColumns = columns.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const uniqueColumnsByField = _.uniq(filteredColumns, col => col.sourceField);

  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return col.sourceField === selectedColumn.sourceField;
      })
    : filteredColumns;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={true}>
        <EuiPopover
          id={props.columnId}
          panelClassName="lnsIndexPattern__dimensionPopover"
          isOpen={isOpen}
          closePopover={() => {
            setOpen(false);
          }}
          ownFocus
          anchorPosition="rightCenter"
          button={
            <EuiFlexItem data-test-subj="indexPattern-dimension" grow={true}>
              <EuiButtonEmpty
                data-test-subj="indexPattern-dimensionPopover-button"
                onClick={() => {
                  setOpen(!isOpen);
                }}
              >
                <span>
                  {selectedColumn
                    ? selectedColumn.label
                    : i18n.translate('xpack.lens.indexPattern.configureDimensionLabel', {
                        defaultMessage: 'Configure dimension',
                      })}
                </span>
              </EuiButtonEmpty>
            </EuiFlexItem>
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
                    columnOrder: getColumnOrder(newColumns),
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

                      const newColumns = {
                        ...props.state.columns,
                        [props.columnId]: newColumn,
                      };

                      props.setState({
                        ...props.state,
                        columnOrder: getColumnOrder(newColumns),
                        columns: newColumns,
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
      {selectedColumn && (
        <EuiFlexItem>
          <EuiButtonIcon
            data-test-subj="indexPattern-dimensionPopover-remove"
            iconType="cross"
            iconSize="s"
            color="danger"
            aria-label="Remove"
            onClick={() => {
              const newColumns: IndexPatternPrivateState['columns'] = {
                ...props.state.columns,
              };
              delete newColumns[props.columnId];

              props.setState({
                ...props.state,
                columns: newColumns,
                columnOrder: getColumnOrder(newColumns),
              });
            }}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
