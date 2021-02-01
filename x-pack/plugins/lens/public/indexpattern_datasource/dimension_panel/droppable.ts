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
import { insertOrReplaceColumn } from '../operations';
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

export function canHandleDrop(props: DatasourceDimensionDropProps<IndexPatternPrivateState>) {
  const operationSupportMatrix = getOperationSupportMatrix(props);

  const { dragging } = props.dragDropContext;
  const layerIndexPatternId = props.state.layers[props.layerId].indexPatternId;

  function hasOperationForField(field: IndexPatternField) {
    return Boolean(operationSupportMatrix.operationByField[field.name]);
  }

  if (isDraggedField(dragging)) {
    const currentColumn = props.state.layers[props.layerId].columns[props.columnId];
    return Boolean(
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
  const { setState, state, droppedItem, columnId, layerId, groupId, isNew } = props;

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
  const isExistingFromSameGroup =
    droppedItem.groupId === groupId && droppedItem.columnId !== columnId && !isNew;

  // reorder in the same group
  if (isExistingFromSameGroup) {
    return onReorderDrop({
      columnId,
      setState,
      state,
      layerId,
      droppedItem,
      operationSupportMatrix,
    });
  }

  // replace or move to compatible group
  const isFromOtherGroup = droppedItem.groupId !== groupId && droppedItem.layerId === layerId;

  if (isFromOtherGroup) {
    const layer = state.layers[layerId];
    const op = { ...layer.columns[droppedItem.columnId] };

    if (props.filterOperations(op)) {
      return onMoveDropToCompatibleGroup({
        columnId,
        setState,
        state,
        layerId,
        droppedItem,
        operationSupportMatrix,
      });
    }
  }

  return false;
}
