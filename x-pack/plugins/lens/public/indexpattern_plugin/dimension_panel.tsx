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
import { DatasourceDimensionPanelProps } from '../types';
import {
  IndexPatternColumn,
  IndexPatternPrivateState,
  columnToOperation,
  FieldBasedIndexPatternColumn,
} from './indexpattern';

import {
  getOperationDisplay,
  getOperations,
  getPotentialColumns,
  getColumnOrder,
  operationDefinitionMap,
} from './operations';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const [isOpen, setOpen] = useState(false);

  const operations = getOperations();
  const operationPanels = getOperationDisplay();

  const columns = getPotentialColumns(props.state, props.suggestedPriority);

  const filteredColumns = columns.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const fieldColumns = filteredColumns.filter(
    col => 'sourceField' in col
  ) as FieldBasedIndexPatternColumn[];

  const uniqueColumnsByField = _.uniq(fieldColumns, col => col.sourceField);

  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return (
          !('sourceField' in selectedColumn) ||
          !('sourceField' in col) ||
          col.sourceField === selectedColumn.sourceField
        );
      })
    : filteredColumns;

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;

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
              {(!selectedColumn || 'sourceField' in selectedColumn) && (
                <EuiComboBox
                  data-test-subj="indexPattern-dimension-field"
                  placeholder="Field"
                  options={uniqueColumnsByField.map(col => ({
                    label: col.sourceField,
                    value: col.operationId,
                  }))}
                  selectedOptions={
                    selectedColumn && 'sourceField' in selectedColumn
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
              )}
            </EuiFlexItem>
            {ParamEditor && (
              <EuiFlexItem grow={2}>
                <ParamEditor
                  state={props.state}
                  setState={props.setState}
                  columnId={props.columnId}
                />
              </EuiFlexItem>
            )}
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
                      const newColumn: IndexPatternColumn = filteredColumns.find(
                        col =>
                          col.operationType === o &&
                          (!('sourceField' in col) ||
                            !('sourceField' in selectedColumn) ||
                            col.sourceField === selectedColumn.sourceField)
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
