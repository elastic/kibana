/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DatasourceDimensionDropHandlerProps,
  DragDropOperation,
  DropType,
  IndexPatternMap,
  isOperation,
  StateSetter,
  VisualizationDimensionGroupConfig,
} from '../../../types';
import {
  insertOrReplaceColumn,
  deleteColumn,
  getColumnOrder,
  reorderByGroups,
  copyColumn,
  hasOperationSupportForMultipleFields,
  getOperationHelperForMultipleFields,
  replaceColumn,
  deleteColumnInLayers,
} from '../../operations';
import { mergeLayer, mergeLayers } from '../../state_helpers';
import { isDraggedField } from '../../pure_utils';
import { getNewOperation, getField } from './get_drop_props';
import { IndexPatternPrivateState, DraggedField, DataViewDragDropOperation } from '../../types';

interface DropHandlerProps<T = DataViewDragDropOperation> {
  state: IndexPatternPrivateState;
  setState: StateSetter<
    IndexPatternPrivateState,
    {
      isDimensionComplete?: boolean;
      forceRender?: boolean;
    }
  >;
  dimensionGroups: VisualizationDimensionGroupConfig[];
  dropType?: DropType;
  source: T;
  target: DataViewDragDropOperation;
  indexPatterns: IndexPatternMap;
}

export function onDrop(props: DatasourceDimensionDropHandlerProps<IndexPatternPrivateState>) {
  const { target, source, dropType, state, indexPatterns } = props;

  if (isDraggedField(source) && isFieldDropType(dropType)) {
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

  if (['move_compatible', 'replace_compatible'].includes(dropType)) {
    return onMoveCompatible(operationProps, true);
  }
  if (['duplicate_compatible', 'replace_duplicate_compatible'].includes(dropType)) {
    return onMoveCompatible(operationProps);
  }
  if (['move_incompatible', 'replace_incompatible'].includes(dropType)) {
    return onMoveIncompatible(operationProps, true);
  }
  if (['duplicate_incompatible', 'replace_duplicate_incompatible'].includes(dropType)) {
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
  const { setState, state, source, target, dimensionGroups, indexPatterns } = props;

  const prioritizedOperation = dimensionGroups.find(
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
    !isDraggedField(source) ||
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
    visualizationGroups: dimensionGroups,
    targetGroup: target.groupId,
    shouldCombineField: shouldAddField,
    initialParams,
  });
  setState(mergeLayer({ state, layerId: target.layerId, newLayer }));
  return true;
}

function onMoveCompatible(
  { setState, state, source, target, dimensionGroups }: DropHandlerProps<DataViewDragDropOperation>,
  shouldDeleteSource?: boolean
) {
  const modifiedLayers = copyColumn({
    layers: state.layers,
    target,
    source,
    shouldDeleteSource,
  });

  if (target.layerId === source.layerId) {
    const updatedColumnOrder = reorderByGroups(
      dimensionGroups,
      getColumnOrder(modifiedLayers[target.layerId]),
      target.groupId,
      target.columnId
    );

    const newLayer = {
      ...modifiedLayers[target.layerId],
      columnOrder: updatedColumnOrder,
      columns: modifiedLayers[target.layerId].columns,
    };

    // Time to replace
    setState(
      mergeLayer({
        state,
        layerId: target.layerId,
        newLayer,
      })
    );
    return true;
  } else {
    setState(mergeLayers({ state, newLayers: modifiedLayers }));

    return true;
  }
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

function onMoveIncompatible(
  {
    setState,
    state,
    source,
    dimensionGroups,
    target,
    indexPatterns,
  }: DropHandlerProps<DataViewDragDropOperation>,
  shouldDeleteSource?: boolean
) {
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

  const outputSourceLayer = shouldDeleteSource
    ? deleteColumn({
        layer: sourceLayer,
        columnId: source.columnId,
        indexPattern,
      })
    : sourceLayer;

  if (target.layerId === source.layerId) {
    const newLayer = insertOrReplaceColumn({
      layer: outputSourceLayer,
      columnId: target.columnId,
      indexPattern,
      op: newOperation,
      field: sourceField,
      visualizationGroups: dimensionGroups,
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
      visualizationGroups: dimensionGroups,
      targetGroup: target.groupId,
      shouldResetLabel: true,
    });
    setState(
      mergeLayers({
        state,
        newLayers: {
          [source.layerId]: outputSourceLayer,
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
  dimensionGroups,
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
    visualizationGroups: dimensionGroups,
    shouldResetLabel: true,
  });

  if (source.layerId === target.layerId) {
    const newLayer = insertOrReplaceColumn({
      layer: outputTargetLayer,
      columnId: source.columnId,
      indexPattern,
      op: newOperationForTarget,
      field: targetField,
      visualizationGroups: dimensionGroups,
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
      visualizationGroups: dimensionGroups,
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
  dimensionGroups,
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
      dimensionGroups,
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
  dimensionGroups,
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
    visualizationGroups: dimensionGroups,
    targetGroup: target.groupId,
    initialParams,
    shouldCombineField: true,
  });

  const newLayers = deleteColumnInLayers({
    layers: { ...state.layers, [target.layerId]: outputTargetLayer },
    source,
  });
  setState(mergeLayers({ state, newLayers }));
  return true;
}
