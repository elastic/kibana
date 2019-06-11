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
  EuiToolTip,
} from '@elastic/eui';
import { DatasourceDimensionPanelProps } from '../types';
import { IndexPatternColumn, IndexPatternPrivateState, columnToOperation } from './indexpattern';

import {
  getOperationDisplay,
  getOperations,
  getPotentialColumns,
  getColumnOrder,
} from './operations';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const [isOpen, setOpen] = useState(false);

  const operations = getOperations();
  const operationPanels = getOperationDisplay();

  const columns = getPotentialColumns(props.state, props.columnId, props.suggestedPriority);

  const filteredColumns = columns.queriable.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const transitionColumns = columns.withTransition.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const uniqueColumnsByField = _.uniq(filteredColumns, col => col.sourceField);

  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return col.sourceField === selectedColumn.sourceField;
      })
    : filteredColumns;

  const transitionFunctionsFromField = selectedColumn
    ? transitionColumns.filter(col => {
        return col.sourceField === selectedColumn.sourceField;
      })
    : transitionColumns;

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
                  const column: IndexPatternColumn = filteredColumns.find(
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
                {operations.map(o => {
                  const isSelected =
                    selectedColumn &&
                    filteredColumns.find(
                      col =>
                        col.operationType === o && col.sourceField === selectedColumn.sourceField
                    );
                  const requiresTransition =
                    selectedColumn &&
                    transitionColumns.find(
                      col =>
                        col.operationType === o && col.sourceField === selectedColumn.sourceField
                    );
                  return (
                    <EuiButtonEmpty
                      data-test-subj={`lns-indexPatternDimension-${o}`}
                      key={o}
                      color={requiresTransition ? 'danger' : isSelected ? 'primary' : 'text'}
                      isDisabled={
                        !selectedColumn ||
                        (!functionsFromField.some(col => col.operationType === o) &&
                          !transitionFunctionsFromField.some(col => col.operationType === o))
                      }
                      onClick={() => {
                        if (!selectedColumn) {
                          return;
                        }

                        if (requiresTransition) {
                          const newColumn = requiresTransition;

                          // For now, clear out all other columns
                          const newColumns = {
                            [props.columnId]: newColumn,
                          };

                          props.setState({
                            ...props.state,
                            columnOrder: getColumnOrder(newColumns),
                            columns: newColumns,
                          });
                        } else {
                          const newColumn: IndexPatternColumn = filteredColumns.find(
                            col =>
                              col.operationType === o &&
                              col.sourceField === selectedColumn.sourceField
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
                        }
                      }}
                    >
                      {requiresTransition ? (
                        <EuiToolTip position="left" content="This option will change other fields">
                          <span>{operationPanels[o].displayName}</span>
                        </EuiToolTip>
                      ) : (
                        <span>{operationPanels[o].displayName}</span>
                      )}
                    </EuiButtonEmpty>
                  );
                })}
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
