/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DatasourceDimensionDropProps,
  DatasourceDimensionDropHandlerProps,
  isDraggedOperation,
} from '../../types';
import { IndexPatternColumn } from '../indexpattern';
import { insertOrReplaceColumn } from '../operations';
import { mergeLayer } from '../state_helpers';
import { hasField, isDraggedField } from '../utils';
import { IndexPatternPrivateState, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { getOperationSupportMatrix } from './operation_support';

export function canHandleDrop(props: DatasourceDimensionDropProps<IndexPatternPrivateState>) {
  const operationSupportMatrix = getOperationSupportMatrix(props);

  const { dragging } = props.dragDropContext;

  const layer = props.state.layers[props.layerId];
  const layerIndexPatternId = layer.indexPatternId;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
  }

  if (isDraggedField(dragging)) {
    const currentColumn = layer.columns[props.columnId];
    return (
      layerIndexPatternId === dragging.indexPatternId &&
      Boolean(hasOperationForField(dragging.field)) &&
      (!currentColumn ||
        (hasField(currentColumn) && currentColumn.sourceField !== dragging.field.name))
    );
  }

  if (
    isDraggedOperation(dragging) &&
    dragging.layerId === props.layerId &&
    props.columnId !== dragging.columnId
  ) {
    const op = layer.columns[dragging.columnId];
    const isOperation = props.filterOperations(op);
    if (isOperation) {
      return true;
    }
    // suggest
    const field =
      hasField(op) && props.state.indexPatterns[layerIndexPatternId].getFieldByName(op.sourceField);
    return field && hasOperationForField(field);
  }
  return false;
}

function reorderElements(items: string[], dest: string, src: string) {
  const result = items.filter((c) => c !== src);
  const destIndex = items.findIndex((c) => c === src);
  const destPosition = result.indexOf(dest);

  const srcIndex = items.findIndex((c) => c === dest);

  result.splice(destIndex < srcIndex ? destPosition + 1 : destPosition, 0, src);
  return result;
}

export function onDrop(props: DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>) {
  const operationSupportMatrix = getOperationSupportMatrix(props);
  const {
    setState,
    state,
    droppedItem,
    dropTarget: { columnId, layerId, groupId, isNew },
  } = props;

  const isExistingFromSameGroup =
    isDraggedOperation(droppedItem) &&
    droppedItem.groupId === groupId &&
    droppedItem.columnId !== columnId &&
    !isNew;

  // reorder in the same group
  if (isExistingFromSameGroup) {
    const dropEl = columnId;

    setState(
      mergeLayer({
        state,
        layerId,
        newLayer: {
          columnOrder: reorderElements(
            state.layers[layerId].columnOrder,
            dropEl,
            droppedItem.columnId
          ),
        },
      })
    );

    return true;
  }

  // duplicate in the same group
  const isNewFromSameGroup =
    isDraggedOperation(droppedItem) && droppedItem.groupId === groupId && isNew;
  // reorderDrop
  if (isNewFromSameGroup) {
    const layer = state.layers[layerId];

    const op = { ...layer.columns[droppedItem.columnId] };
    console.log('woah', op);
    const newColumns = {
      ...layer.columns,
      [columnId]: op,
    };

    const newColumnOrder = [...layer.columnOrder, columnId];
    // Time to replace
    setState(
      mergeLayer({
        state,
        layerId,
        newLayer: {
          columnOrder: newColumnOrder,
          columns: newColumns,
        },
      })
    );
    return true;
  }

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
  }

  // replace or move to compatible group
  const isFromOtherGroup =
    isDraggedOperation(droppedItem) &&
    droppedItem.groupId !== groupId &&
    droppedItem.layerId === layerId;

  if (isFromOtherGroup) {
    console.log('from other group');
    const layer = state.layers[layerId];
    const op = { ...layer.columns[droppedItem.columnId] };
    if (props.filterOperations(op)) {
      const newColumns = { ...layer.columns };
      delete newColumns[droppedItem.columnId];
      newColumns[columnId] = op;

      const newColumnOrder = [...layer.columnOrder];
      const oldIndex = newColumnOrder.findIndex((c) => c === droppedItem.columnId);
      const newIndex = newColumnOrder.findIndex((c) => c === columnId);

      if (newIndex === -1) {
        newColumnOrder[oldIndex] = columnId;
      } else {
        newColumnOrder.splice(oldIndex, 1);
      }

      // Time to replace
      setState(
        mergeLayer({
          state,
          layerId,
          newLayer: {
            columnOrder: newColumnOrder,
            columns: newColumns,
          },
        })
      );
      return { deleted: droppedItem.columnId };
    } else {
// move to suggest
      const layer = state.layers[layerId];
      const field =
        hasField(op) && state.indexPatterns[layer.indexPatternId].getFieldByName(op.sourceField);
      if (!field || !hasOperationForField(field)) {
        // TODO: What do we do if we couldn't find a column?
        return false;
      }

      // dragged field, not operation

      const operationsForNewField = operationSupportMatrix.operationByField[field.name];

      if (!operationsForNewField || operationsForNewField.size === 0) {
        return false;
      }


      const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;
      const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

      // Detects if we can change the field only, otherwise change field + operation
      const fieldIsCompatibleWithCurrent =
        selectedColumn &&
        operationSupportMatrix.operationByField[field.name]?.has(selectedColumn.operationType);

      const newLayer = insertOrReplaceColumn({
        layer,
        columnId,
        indexPattern: currentIndexPattern,
        op: fieldIsCompatibleWithCurrent
          ? selectedColumn.operationType
          : operationsForNewField.values().next().value,
        field: field,
      });

      trackUiEvent('drop_onto_dimension');
      const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
      trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
      setState(mergeLayer({ state, layerId, newLayer }));

      return { deleted: droppedItem.columnId }; //-> to do for removing the old one
      return true;
    }
  }

  if (!isDraggedField(droppedItem) || !hasOperationForField(droppedItem.field)) {
    // TODO: What do we do if we couldn't find a column?
    return false;
  }

  // dragged field, not operation

  const operationsForNewField = operationSupportMatrix.operationByField[droppedItem.field.name];

  if (!operationsForNewField || operationsForNewField.size === 0) {
    return false;
  }

  const layer = state.layers[layerId];

  const selectedColumn: IndexPatternColumn | null = layer.columns[columnId] || null;
  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

  // Detects if we can change the field only, otherwise change field + operation
  const fieldIsCompatibleWithCurrent =
    selectedColumn &&
    operationSupportMatrix.operationByField[droppedItem.field.name]?.has(
      selectedColumn.operationType
    );

  const newLayer = insertOrReplaceColumn({
    layer,
    columnId,
    indexPattern: currentIndexPattern,
    op: fieldIsCompatibleWithCurrent
      ? selectedColumn.operationType
      : operationsForNewField.values().next().value,
    field: droppedItem.field,
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
  setState(mergeLayer({ state, layerId, newLayer }));

  return true;
}
