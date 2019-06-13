/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { DatasourceDimensionPanelProps } from '../../types';
import {
  IndexPatternColumn,
  IndexPatternPrivateState,
  columnToOperation,
  IndexPatternField,
} from '../indexpattern';

import { getPotentialColumns, operationDefinitionMap, getColumnOrder } from '../operations';
import { FieldSelect } from './field_select';
import { Settings } from './settings';
import { DragContextState, ChildDragDropProvider, DragDrop } from '../../drag_drop';

export type IndexPatternDimensionPanelProps = DatasourceDimensionPanelProps & {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  dragDropContext: DragContextState;
};

export function IndexPatternDimensionPanel(props: IndexPatternDimensionPanelProps) {
  const columns = getPotentialColumns(props.state, props.suggestedPriority);

  const filteredColumns = columns.filter(col => {
    return props.filterOperations(columnToOperation(col));
  });

  const selectedColumn: IndexPatternColumn | null = props.state.columns[props.columnId] || null;

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].inlineOptions;

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;
    const field = dragging as IndexPatternField;

    return (
      !!field &&
      !!field.type &&
      filteredColumns.some(
        col => 'sourceField' in col && col.sourceField === (field as IndexPatternField).name
      )
    );
  }

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const column = columns.find(
            col => 'sourceField' in col && col.sourceField === (field as IndexPatternField).name
          );

          if (!column) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          const newColumns: IndexPatternPrivateState['columns'] = {
            ...props.state.columns,
            [props.columnId]: column,
          };

          props.setState({
            ...props.state,
            columnOrder: getColumnOrder(newColumns),
            columns: newColumns,
          });
        }}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={null}>
            <EuiFlexGroup alignItems="center">
              <Settings
                {...props}
                selectedColumn={selectedColumn}
                filteredColumns={filteredColumns}
              />
              <FieldSelect
                {...props}
                selectedColumn={selectedColumn}
                filteredColumns={filteredColumns}
              />
            </EuiFlexGroup>
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
        </EuiFlexGroup>
      </DragDrop>
    </ChildDragDropProvider>
  );
}
