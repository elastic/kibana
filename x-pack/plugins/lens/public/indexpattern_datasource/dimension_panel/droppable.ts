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
import { buildColumn, changeField } from '../operations';
import { changeColumn, mergeLayer } from '../state_helpers';
import { isDraggedField, hasField } from '../utils';
import { IndexPatternPrivateState, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { getOperationSupportMatrix } from './operation_support';

export function canHandleDrop(props: DatasourceDimensionDropProps<IndexPatternPrivateState>) {
  const operationSupportMatrix = getOperationSupportMatrix(props);

  const { dragging } = props.dragDropContext;
  const layerIndexPatternId = props.state.layers[props.layerId].indexPatternId;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
  }

  if (isDraggedField(dragging)) {
    return (
      layerIndexPatternId === dragging.indexPatternId &&
      Boolean(hasOperationForField(dragging.field))
    );
  }

  if (
    isDraggedOperation(dragging) &&
    dragging.layerId === props.layerId &&
    props.columnId !== dragging.columnId
  ) {
    const op = props.state.layers[props.layerId].columns[dragging.columnId];
    return props.filterOperations(op);
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
  const { setState, state, layerId, columnId, droppedItem } = props;

  if (isDraggedOperation(droppedItem) && props.isReorder) {
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

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
  }

  if (isDraggedOperation(droppedItem) && droppedItem.layerId === layerId) {
    const layer = state.layers[layerId];
    const op = { ...layer.columns[droppedItem.columnId] };
    if (!props.filterOperations(op)) {
      return false;
    }

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
  }

  if (!isDraggedField(droppedItem) || !hasOperationForField(droppedItem.field)) {
    // TODO: What do we do if we couldn't find a column?
    return false;
  }

  const operationsForNewField = operationSupportMatrix.operationByField[droppedItem.field.name];

  const selectedColumn: IndexPatternColumn | null = state.layers[layerId].columns[columnId] || null;
  const currentIndexPattern = state.indexPatterns[state.layers[layerId]?.indexPatternId];

  // We need to check if dragging in a new field, was just a field change on the same
  // index pattern and on the same operations (therefore checking if the new field supports
  // our previous operation)
  const hasFieldChanged =
    selectedColumn &&
    hasField(selectedColumn) &&
    selectedColumn.sourceField !== droppedItem.field.name &&
    operationsForNewField &&
    operationsForNewField.has(selectedColumn.operationType);

  if (!operationsForNewField || operationsForNewField.size === 0) {
    return false;
  }

  // If only the field has changed use the onFieldChange method on the operation to get the
  // new column, otherwise use the regular buildColumn to get a new column.
  const newColumn = hasFieldChanged
    ? changeField(selectedColumn, currentIndexPattern, droppedItem.field)
    : buildColumn({
        op: operationsForNewField.values().next().value,
        columns: state.layers[layerId].columns,
        indexPattern: currentIndexPattern,
        layerId,
        suggestedPriority: props.suggestedPriority,
        field: droppedItem.field,
        previousColumn: selectedColumn,
      });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');

  setState(
    changeColumn({
      state,
      layerId,
      columnId,
      newColumn,
      // If the field has changed, the onFieldChange method needs to take care of everything including moving
      // over params. If we create a new column above we want changeColumn to move over params.
      keepParams: !hasFieldChanged,
    })
  );

  return true;
}
