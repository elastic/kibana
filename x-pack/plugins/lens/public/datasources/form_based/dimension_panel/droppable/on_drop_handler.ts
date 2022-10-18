/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isDraggedDataViewField } from '../../../../utils';
import {
  DatasourceDimensionDropHandlerProps,
  DragDropOperation,
  DropType,
  IndexPatternMap,
  isOperation,
  StateSetter,
  VisualizationDimensionGroupConfig,
  DraggedField,
} from '../../../../types';
import {
  insertOrReplaceColumn,
  getColumnOrder,
  reorderByGroups,
  copyColumn,
  hasOperationSupportForMultipleFields,
  getOperationHelperForMultipleFields,
  replaceColumn,
} from '../../operations';
import { mergeLayer, mergeLayers } from '../../state_helpers';
import { getNewOperation, getField } from './get_drop_props';
import { FormBasedPrivateState, DataViewDragDropOperation } from '../../types';

interface DropHandlerProps<T = DataViewDragDropOperation> {
  state: FormBasedPrivateState;
  setState: StateSetter<
    FormBasedPrivateState,
    {
      isDimensionComplete?: boolean;
      forceRender?: boolean;
    }
  >;
  targetLayerDimensionGroups: VisualizationDimensionGroupConfig[];
  dropType?: DropType;
  source: T;
  target: DataViewDragDropOperation;
  indexPatterns: IndexPatternMap;
}

export function onDrop(props: DatasourceDimensionDropHandlerProps<FormBasedPrivateState>) {
  const { target, source, dropType, state, indexPatterns } = props;

  if (isDraggedDataViewField(source) && isFieldDropType(dropType)) {
    return onFieldDrop(
      {
        ...props,
        target: {
          ...target,
          dataView: indexPatterns[state.layers[target.layerId].indexPatternId],
        },
        source,
        indexPatterns,
      },
      dropType === 'field_combine'
    );
  }

  if (!isOperation(source)) {
    return false;
  }
  const sourceDataView = indexPatterns[state.layers[source.layerId].indexPatternId];
  const targetDataView = indexPatterns[state.layers[target.layerId].indexPatternId];
  if (sourceDataView !== targetDataView) {
    return false;
  }

  const operationProps = {
    ...props,
    target: {
      ...target,
      dataView: targetDataView,
    },
    source: {
      ...source,
      dataView: sourceDataView,
    },
    indexPatterns,
  };
  if (dropType === 'reorder') {
    return onReorder(operationProps);
  }

  if (
    [
      'duplicate_compatible',
      'replace_duplicate_compatible',
      'move_compatible',
      'replace_compatible',
    ].includes(dropType)
  ) {
    return onMoveCompatible(operationProps);
  }
  if (
    [
      'duplicate_incompatible',
      'replace_duplicate_incompatible',
      'move_incompatible',
      'replace_incompatible',
    ].includes(dropType)
  ) {
    return onMoveIncompatible(operationProps);
  }
  if (dropType === 'swap_compatible') {
    return onSwapCompatible(operationProps);
  }
  if (dropType === 'swap_incompatible') {
    return onSwapIncompatible(operationProps);
  }
  if (['combine_incompatible', 'combine_compatible'].includes(dropType)) {
    return onCombine(operationProps);
  }
}

const isFieldDropType = (dropType: DropType) =>
  ['field_add', 'field_replace', 'field_combine'].includes(dropType);

function onFieldDrop(props: DropHandlerProps<DraggedField>, shouldAddField?: boolean) {
  const { setState, state, source, target, targetLayerDimensionGroups, indexPatterns } = props;

  const prioritizedOperation = targetLayerDimensionGroups.find(
    (g) => g.groupId === target.groupId
  )?.prioritizedOperation;

  const layer = state.layers[target.layerId];
  const indexPattern = indexPatterns[layer.indexPatternId];
  const targetColumn = layer.columns[target.columnId];
  // discourage already used operations for a field
  const alreadyUsedOperations = new Set(
    Object.values(layer.columns)
      .filter((column) => 'sourceField' in column && column.sourceField === source.field.name)
      .map((column) => column.operationType)
  );

  const newOperation = shouldAddField
    ? targetColumn.operationType
    : getNewOperation(
        source.field,
        target.filterOperations,
        targetColumn,
        prioritizedOperation,
        alreadyUsedOperations
      );

  if (
    !isDraggedDataViewField(source) ||
    !newOperation ||
    (shouldAddField &&
      !hasOperationSupportForMultipleFields(indexPattern, targetColumn, undefined, source.field))
  ) {
    return false;
  }
  const field = shouldAddField ? getField(targetColumn, indexPattern) : source.field;
  const initialParams = shouldAddField
    ? {
        params:
          getOperationHelperForMultipleFields(targetColumn.operationType)?.({
            targetColumn,
            field: source.field,
            indexPattern,
          }) || {},
      }
    : undefined;

  const newLayer = insertOrReplaceColumn({
    layer,
    columnId: target.columnId,
    indexPattern,
    op: newOperation,
    field,
    visualizationGroups: targetLayerDimensionGroups,
    targetGroup: target.groupId,
    shouldCombineField: shouldAddField,
    initialParams,
  });
  setState(mergeLayer({ state, layerId: target.layerId, newLayer }));
  return true;
}

function onMoveCompatible({
  setState,
  state,
  source,
  target,
  targetLayerDimensionGroups,
}: DropHandlerProps<DataViewDragDropOperation>) {
  let modifiedLayers = copyColumn({
    layers: state.layers,
    target,
    source,
  });

  const updatedColumnOrder = reorderByGroups(
    targetLayerDimensionGroups,
    getColumnOrder(modifiedLayers[target.layerId]),
    target.groupId,
    target.columnId
  );

  modifiedLayers = {
    ...modifiedLayers,
    [target.layerId]: {
      ...modifiedLayers[target.layerId],
      columnOrder: updatedColumnOrder,
      columns: modifiedLayers[target.layerId].columns,
    },
  };

  setState(
    mergeLayers({
      state,
      newLayers: modifiedLayers,
    })
  );
  return true;
}

function onReorder({
  setState,
  state,
  source,
  target,
}: DropHandlerProps<DataViewDragDropOperation>) {
  function reorderElements(items: string[], targetId: string, sourceId: string) {
    const result = items.filter((c) => c !== sourceId);
    const targetIndex = items.findIndex((c) => c === sourceId);
    const sourceIndex = items.findIndex((c) => c === targetId);

    const targetPosition = result.indexOf(targetId);
    result.splice(targetIndex < sourceIndex ? targetPosition + 1 : targetPosition, 0, sourceId);
    return result;
  }

  setState(
    mergeLayer({
      state,
      layerId: target.layerId,
      newLayer: {
        columnOrder: reorderElements(
          state.layers[target.layerId].columnOrder,
          target.columnId,
          source.columnId
        ),
      },
    })
  );
  return true;
}

function onMoveIncompatible({
  setState,
  state,
  source,
  targetLayerDimensionGroups,
  target,
  indexPatterns,
}: DropHandlerProps<DataViewDragDropOperation>) {
  const targetLayer = state.layers[target.layerId];
  const targetColumn = targetLayer.columns[target.columnId] || null;
  const sourceLayer = state.layers[source.layerId];
  const indexPattern = indexPatterns[sourceLayer.indexPatternId];
  const sourceColumn = sourceLayer.columns[source.columnId];
  const sourceField = getField(sourceColumn, indexPattern);
  const newOperation = getNewOperation(sourceField, target.filterOperations, targetColumn);
  if (!newOperation) {
    return false;
  }

  if (target.layerId === source.layerId) {
    const newLayer = insertOrReplaceColumn({
      layer: sourceLayer,
      columnId: target.columnId,
      indexPattern,
      op: newOperation,
      field: sourceField,
      visualizationGroups: targetLayerDimensionGroups,
      targetGroup: target.groupId,
      shouldResetLabel: true,
    });
    setState(
      mergeLayer({
        state,
        layerId: target.layerId,
        newLayer,
      })
    );
    return true;
  } else {
    const outputTargetLayer = insertOrReplaceColumn({
      layer: targetLayer,
      columnId: target.columnId,
      indexPattern,
      op: newOperation,
      field: sourceField,
      visualizationGroups: targetLayerDimensionGroups,
      targetGroup: target.groupId,
      shouldResetLabel: true,
    });
    setState(
      mergeLayers({
        state,
        newLayers: {
          [source.layerId]: sourceLayer,
          [target.layerId]: outputTargetLayer,
        },
      })
    );
    return true;
  }
}

function onSwapIncompatible({
  setState,
  state,
  source,
  targetLayerDimensionGroups,
  target,
  indexPatterns,
}: DropHandlerProps<DragDropOperation>) {
  const targetLayer = state.layers[target.layerId];
  const sourceLayer = state.layers[source.layerId];
  const indexPattern = indexPatterns[targetLayer.indexPatternId];
  const sourceColumn = sourceLayer.columns[source.columnId];
  const targetColumn = targetLayer.columns[target.columnId];

  const sourceField = getField(sourceColumn, indexPattern);
  const targetField = getField(targetColumn, indexPattern);

  const newOperationForSource = getNewOperation(sourceField, target.filterOperations, targetColumn);
  const newOperationForTarget = getNewOperation(targetField, source.filterOperations, sourceColumn);

  if (!newOperationForSource || !newOperationForTarget) {
    return false;
  }

  const outputTargetLayer = insertOrReplaceColumn({
    layer: targetLayer,
    columnId: target.columnId,
    targetGroup: target.groupId,
    indexPattern,
    op: newOperationForSource,
    field: sourceField,
    visualizationGroups: targetLayerDimensionGroups,
    shouldResetLabel: true,
  });

  if (source.layerId === target.layerId) {
    const newLayer = insertOrReplaceColumn({
      layer: outputTargetLayer,
      columnId: source.columnId,
      indexPattern,
      op: newOperationForTarget,
      field: targetField,
      visualizationGroups: targetLayerDimensionGroups,
      targetGroup: source.groupId,
      shouldResetLabel: true,
    });
    setState(
      mergeLayer({
        state,
        layerId: target.layerId,
        newLayer,
      })
    );
    return true;
  } else {
    const outputSourceLayer = insertOrReplaceColumn({
      layer: sourceLayer,
      columnId: source.columnId,
      indexPattern,
      op: newOperationForTarget,
      field: targetField,
      visualizationGroups: targetLayerDimensionGroups,
      targetGroup: source.groupId,
      shouldResetLabel: true,
    });
    setState(
      mergeLayers({
        state,
        newLayers: { [source.layerId]: outputSourceLayer, [target.layerId]: outputTargetLayer },
      })
    );
    return true;
  }
}

const swapColumnOrder = (columnOrder: string[], sourceId: string, targetId: string) => {
  const sourceIndex = columnOrder.findIndex((c) => c === sourceId);
  const targetIndex = columnOrder.findIndex((c) => c === targetId);

  const newColumnOrder = [...columnOrder];
  newColumnOrder[sourceIndex] = targetId;
  newColumnOrder[targetIndex] = sourceId;

  return newColumnOrder;
};

function onSwapCompatible({
  setState,
  state,
  source,
  targetLayerDimensionGroups,
  target,
}: DropHandlerProps<DataViewDragDropOperation>) {
  if (target.layerId === source.layerId) {
    const layer = state.layers[target.layerId];
    const newColumns = {
      ...layer.columns,
      [target.columnId]: { ...layer.columns[source.columnId] },
      [source.columnId]: { ...layer.columns[target.columnId] },
    };

    let updatedColumnOrder = swapColumnOrder(layer.columnOrder, source.columnId, target.columnId);
    updatedColumnOrder = reorderByGroups(
      targetLayerDimensionGroups,
      updatedColumnOrder,
      target.groupId,
      target.columnId
    );

    setState(
      mergeLayer({
        state,
        layerId: target.layerId,
        newLayer: {
          columnOrder: updatedColumnOrder,
          columns: newColumns,
        },
      })
    );

    return true;
  } else {
    // TODO why not reorderByGroups for both columns? Are they already in that order?
    const newTargetLayer = copyColumn({
      layers: state.layers,
      target,
      source,
      shouldDeleteSource: true,
    })[target.layerId];

    const newSourceLayer = copyColumn({
      layers: state.layers,
      target: source,
      source: target,
      shouldDeleteSource: true,
    })[source.layerId];

    setState(
      mergeLayers({
        state,
        newLayers: {
          [source.layerId]: newSourceLayer,
          [target.layerId]: newTargetLayer,
        },
      })
    );

    return true;
  }
}

function onCombine({
  state,
  setState,
  source,
  target,
  targetLayerDimensionGroups,
  indexPatterns,
}: DropHandlerProps<DataViewDragDropOperation>) {
  const targetLayer = state.layers[target.layerId];
  const targetColumn = targetLayer.columns[target.columnId];
  const targetField = getField(targetColumn, target.dataView);
  const indexPattern = indexPatterns[targetLayer.indexPatternId];

  const sourceLayer = state.layers[source.layerId];
  const sourceColumn = sourceLayer.columns[source.columnId];
  const sourceField = getField(sourceColumn, indexPattern);
  // extract the field from the source column
  if (!sourceField || !targetField) {
    return false;
  }
  // pass it to the target column and delete the source column
  const initialParams = {
    params:
      getOperationHelperForMultipleFields(targetColumn.operationType)?.({
        targetColumn,
        sourceColumn,
        indexPattern,
      }) ?? {},
  };

  const outputTargetLayer = replaceColumn({
    layer: targetLayer,
    columnId: target.columnId,
    indexPattern,
    op: targetColumn.operationType,
    field: targetField,
    visualizationGroups: targetLayerDimensionGroups,
    targetGroup: target.groupId,
    initialParams,
    shouldCombineField: true,
  });

  setState(
    mergeLayers({ state, newLayers: { ...state.layers, [target.layerId]: outputTargetLayer } })
  );
  return true;
}
