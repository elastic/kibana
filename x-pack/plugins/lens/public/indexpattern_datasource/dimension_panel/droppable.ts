/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DatasourceDimensionDropProps,
  DatasourceDimensionDropHandlerProps,
  isDraggedOperation,
  DraggedOperation,
} from '../../types';
import { IndexPatternColumn } from '../indexpattern';
import { insertOrReplaceColumn, deleteColumn } from '../operations';
import { mergeLayer } from '../state_helpers';
import { hasField, isDraggedField } from '../utils';
import { IndexPatternPrivateState, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { getOperationSupportMatrix, OperationSupportMatrix } from './operation_support';

type DropHandlerProps<T = DraggedOperation> = Pick<
  DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>,
  'columnId' | 'setState' | 'state' | 'layerId' | 'droppedItem'
> & {
  droppedItem: T;
  operationSupportMatrix: OperationSupportMatrix;
};

export function getDropTypes(
  props: DatasourceDimensionDropProps<IndexPatternPrivateState> & { groupId: string }
) {
  const { dragging } = props.dragDropContext;
  if (!dragging) {
    return;
  }
  const operationSupportMatrix = getOperationSupportMatrix(props);

  const layerIndexPatternId = props.state.layers[props.layerId].indexPatternId;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
  }

  if (isDraggedField(dragging)) {
    const currentColumn = props.state.layers[props.layerId].columns[props.columnId];
    if (
      Boolean(
        layerIndexPatternId === dragging.indexPatternId && hasOperationForField(dragging.field)
      )
    ) {
      if (!currentColumn) {
        return 'add';
      } else if (hasField(currentColumn) && currentColumn.sourceField !== dragging.field.name) {
        return 'remove_add';
      }
    }
    return;
  }

  if (
    isDraggedOperation(dragging) &&
    dragging.layerId === props.layerId &&
    props.columnId !== dragging.columnId
  ) {
    const currentColumn = props.state.layers[props.layerId].columns[props.columnId];

    // same group
    if (props.groupId === dragging.groupId) {
      if (currentColumn) {
        return 'reorder';
      }
      return 'duplicateInGroup';
    }
    // compatible group
    const op = props.state.layers[dragging.layerId].columns[dragging.columnId];
    if (!op) {
      return;
    }
    if (props.filterOperations(op)) {
      if (currentColumn) {
        return 'remove_move'; // in the future also 'swap' and 'remove_add'
      } else {
        return 'move'; // in the future also 'add'
      }
    }

    // suggest
    const field =
      hasField(op) && props.state.indexPatterns[layerIndexPatternId].getFieldByName(op.sourceField);
    if (field && hasOperationForField(field)) {
      if (currentColumn) {
        return 'remove_convert_move'; // in the future also 'remove_convert_add', 'convert_swap', 'remove_convert_move'
      } else {
        return 'convert_add'; // in the future also 'convert_move'
      }
    }
  }
}

function reorderElements(items: string[], dest: string, src: string) {
  const result = items.filter((c) => c !== src);
  const destIndex = items.findIndex((c) => c === src);
  const destPosition = result.indexOf(dest);

  const srcIndex = items.findIndex((c) => c === dest);

  result.splice(destIndex < srcIndex ? destPosition + 1 : destPosition, 0, src);
  return result;
}

const onReorderDrop = ({ columnId, setState, state, layerId, droppedItem }: DropHandlerProps) => {
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        columnOrder: reorderElements(
          state.layers[layerId].columnOrder,
          columnId,
          droppedItem.columnId
        ),
      },
    })
  );

  return true;
};

const onMoveDropToNonCompatibleGroup = ({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  operationSupportMatrix,
}: DropHandlerProps) => {
  // move to suggest
  const layer = state.layers[layerId];
  const op = { ...layer.columns[droppedItem.columnId] };
  const field =
    hasField(op) && state.indexPatterns[layer.indexPatternId].getFieldByName(op.sourceField);
  if (!field) {
    return false;
  }

  const operationsForNewField = operationSupportMatrix.operationByField[field.name];

  if (!operationsForNewField || operationsForNewField.size === 0) {
    return false;
  }

  const currentIndexPattern = state.indexPatterns[layer.indexPatternId];

  const newLayer = insertOrReplaceColumn({
    layer: deleteColumn({
      layer,
      columnId: droppedItem.columnId,
      indexPattern: currentIndexPattern,
    }),
    columnId,
    indexPattern: currentIndexPattern,
    op: operationsForNewField.values().next().value,
    field,
  });

  trackUiEvent('drop_onto_dimension');
  const hasData = Object.values(state.layers).some(({ columns }) => columns.length);
  trackUiEvent(hasData ? 'drop_non_empty' : 'drop_empty');
  setState(
    mergeLayer({
      state,
      layerId,
      newLayer: {
        ...newLayer,
      },
    })
  );

  return { deleted: droppedItem.columnId }; // -> to do for removing the old one

  return true; // duplicating
};

const onSameGroupDuplicateDrop = ({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
}: DropHandlerProps) => {
  const layer = state.layers[layerId];

  const op = { ...layer.columns[droppedItem.columnId] };
  const newColumns = {
    ...layer.columns,
    [columnId]: op,
  };

  const newColumnOrder = [...layer.columnOrder];
  // put a new bucketed dimension just in front of the metric dimensions, a metric dimension in the back of the array
  // TODO this logic does not take into account groups - we probably need to pass the current
  // group config to this position to place the column right
  const insertionIndex = op.isBucketed
    ? newColumnOrder.findIndex((id) => !newColumns[id].isBucketed)
    : newColumnOrder.length;
  newColumnOrder.splice(insertionIndex, 0, columnId);
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
};

const onMoveDropToCompatibleGroup = ({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
}: DropHandlerProps) => {
  const layer = state.layers[layerId];
  const op = { ...layer.columns[droppedItem.columnId] };
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
};

const onFieldDrop = ({
  columnId,
  setState,
  state,
  layerId,
  droppedItem,
  operationSupportMatrix,
}: DropHandlerProps<unknown>) => {
  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
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
};

export function onDrop(props: DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>) {
  const operationSupportMatrix = getOperationSupportMatrix(props);
  const { setState, state, droppedItem, columnId, layerId, groupId, dropType } = props;

  if (!isDraggedOperation(droppedItem)) {
    return onFieldDrop({
      columnId,
      setState,
      state,
      layerId,
      droppedItem,
      operationSupportMatrix,
    });
  }

  if (droppedItem.groupId === groupId) {
    if (dropType === 'reorder') {
      return onReorderDrop({
        columnId,
        setState,
        state,
        layerId,
        droppedItem,
        operationSupportMatrix,
      });
    } else if (dropType === 'duplicateInGroup') {
      return onSameGroupDuplicateDrop({
        columnId,
        setState,
        state,
        layerId,
        droppedItem,
        operationSupportMatrix,
      });
    }
  }

  if (dropType === 'remove_move' || dropType === 'move') {
    return onMoveDropToCompatibleGroup({
      columnId,
      setState,
      state,
      layerId,
      droppedItem,
      operationSupportMatrix,
    });
  }

  if (dropType === 'convert_add' || dropType === 'remove_convert_move') {
    return onMoveDropToNonCompatibleGroup({
      columnId,
      setState,
      state,
      layerId,
      droppedItem,
      operationSupportMatrix,
    });
  }
}
