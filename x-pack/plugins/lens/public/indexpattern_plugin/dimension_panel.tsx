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
  IndexPatternField,
} from './indexpattern';

import {
  getOperationDisplay,
  getOperations,
  getPotentialColumns,
  getColumnOrder,
} from './operations';
import { DragContextState, DragDrop, ChildDragDropProvider } from '../drag_drop';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  dragDropContext: DragContextState;
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

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;
    const field = dragging as IndexPatternField;

    return (
      !!field &&
      !!field.type &&
      filteredColumns.some(({ sourceField }) => sourceField === (field as IndexPatternField).name)
    );
  }

  function changeColumn(column: IndexPatternColumn) {
    const newColumns: IndexPatternPrivateState['columns'] = {
      ...props.state.columns,
      [props.columnId]: column,
    };

    props.setState({
      ...props.state,
      columnOrder: getColumnOrder(newColumns),
      columns: newColumns,
    });
  }

  const uniqueColumnsByField = _.uniq(filteredColumns, col => col.sourceField);

  const functionsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return col.sourceField === selectedColumn.sourceField;
      })
    : filteredColumns;

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const column = columns.find(
            ({ sourceField }) => sourceField === (field as IndexPatternField).name
          );

          if (!column) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          changeColumn(column);
        }}
      >
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
                              col.operationType === o &&
                              col.sourceField === selectedColumn.sourceField
                          )!;

                          changeColumn(newColumn);
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
      </DragDrop>
    </ChildDragDropProvider>
  );
}
