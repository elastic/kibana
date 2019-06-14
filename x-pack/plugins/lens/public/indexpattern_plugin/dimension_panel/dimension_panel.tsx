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

import { getPotentialColumns, operationDefinitionMap } from '../operations';
import { FieldSelect } from './field_select';
import { Settings } from './settings';
import { DragContextState, ChildDragDropProvider, DragDrop } from '../../drag_drop';
import { changeColumn, hasField } from '../state_helpers';

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

  function findColumnByField(field: IndexPatternField) {
    return filteredColumns.find(col => hasField(col) && col.sourceField === field.name);
  }

  function canHandleDrop() {
    const { dragging } = props.dragDropContext;
    const field = dragging as IndexPatternField;

    return !!field && !!field.type && !!findColumnByField(field as IndexPatternField);
  }

  return (
    <ChildDragDropProvider {...props.dragDropContext}>
      <DragDrop
        data-test-subj="indexPattern-dropTarget"
        droppable={canHandleDrop()}
        onDrop={field => {
          const column = findColumnByField(field as IndexPatternField);

          if (!column) {
            // TODO: What do we do if we couldn't find a column?
            return;
          }

          props.setState(changeColumn(props.state, props.columnId, column));
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
