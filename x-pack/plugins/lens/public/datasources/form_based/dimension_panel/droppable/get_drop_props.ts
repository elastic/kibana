/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isOperation,
  DropType,
  DragDropOperation,
  IndexPattern,
  IndexPatternMap,
  IndexPatternField,
} from '../../../../types';
import {
  getCurrentFieldsForOperation,
  getOperationDisplay,
  hasOperationSupportForMultipleFields,
} from '../../operations';
import { isDraggedDataViewField, isOperationFromTheSameGroup } from '../../../../utils';
import { hasField } from '../../pure_utils';
import { DragContextState } from '../../../../drag_drop/providers';
import { OperationMetadata, DraggedField } from '../../../../types';
import { getOperationTypesForField } from '../../operations';
import { GenericIndexPatternColumn } from '../../form_based';
import { FormBasedPrivateState, DataViewDragDropOperation } from '../../types';

interface GetDropPropsArgs {
  state: FormBasedPrivateState;
  source?: DragContextState['dragging'];
  target: DragDropOperation;
  indexPatterns: IndexPatternMap;
}

type DropProps = { dropTypes: DropType[]; nextLabel?: string } | undefined;

const operationDisplay = getOperationDisplay();

export function getNewOperation(
  field: IndexPatternField | undefined | false,
  filterOperations: (meta: OperationMetadata) => boolean,
  targetColumn?: GenericIndexPatternColumn,
  prioritizedOperation?: GenericIndexPatternColumn['operationType'],
  alreadyUsedOperations?: Set<string>
) {
  if (!field) {
    return;
  }
  const newOperations = getOperationTypesForField(field, filterOperations, alreadyUsedOperations);
  if (!newOperations.length) {
    return;
  }
  // Detects if we can change the field only, otherwise change field + operation
  const shouldOperationPersist = targetColumn && newOperations.includes(targetColumn.operationType);
  if (shouldOperationPersist) {
    return targetColumn.operationType;
  }
  const existsPrioritizedOperation =
    prioritizedOperation && newOperations.includes(prioritizedOperation);
  return existsPrioritizedOperation ? prioritizedOperation : newOperations[0];
}

export function getField(column: GenericIndexPatternColumn | undefined, dataView: IndexPattern) {
  if (!column) {
    return;
  }
  const field = (hasField(column) && dataView.getFieldByName(column.sourceField)) || undefined;
  return field;
}

export function getDropProps(
  props: GetDropPropsArgs
): { dropTypes: DropType[]; nextLabel?: string } | undefined {
  const { state, source, target, indexPatterns } = props;
  if (!source) {
    return;
  }
  const targetProps: DataViewDragDropOperation = {
    ...target,
    column: state.layers[target.layerId].columns[target.columnId],
    dataView: indexPatterns[state.layers[target.layerId].indexPatternId],
  };

  if (isDraggedDataViewField(source)) {
    return getDropPropsForField({ ...props, source, target: targetProps });
  }

  if (isOperation(source)) {
    const sourceProps: DataViewDragDropOperation = {
      ...source,
      column: state.layers[source.layerId]?.columns[source.columnId],
      dataView: indexPatterns[state.layers[source.layerId]?.indexPatternId],
    };
    if (!sourceProps.column) {
      return;
    }
    if (target.columnId !== source.columnId && targetProps.dataView === sourceProps.dataView) {
      if (isOperationFromTheSameGroup(source, target)) {
        return !targetProps.column
          ? { dropTypes: ['duplicate_compatible'] }
          : { dropTypes: ['reorder'] };
      }

      if (targetProps.filterOperations?.(sourceProps?.column)) {
        return getDropPropsForCompatibleGroup(sourceProps, targetProps);
      } else if (hasTheSameField(sourceProps.column, targetProps.column)) {
        return;
      } else {
        return getDropPropsFromIncompatibleGroup(sourceProps, targetProps);
      }
    }
  }
}

function hasTheSameField(
  sourceColumn: GenericIndexPatternColumn,
  targetColumn?: GenericIndexPatternColumn
) {
  const targetFields = targetColumn ? getCurrentFieldsForOperation(targetColumn) : [];
  const sourceFields = new Set(getCurrentFieldsForOperation(sourceColumn));

  return (
    targetFields.length === sourceFields.size &&
    targetFields.every((field) => sourceFields.has(field))
  );
}

function getDropPropsForField({
  state,
  source,
  target,
  indexPatterns,
}: GetDropPropsArgs & { source: DraggedField }): DropProps {
  const targetColumn = state.layers[target.layerId].columns[target.columnId];
  const isTheSameIndexPattern =
    state.layers[target.layerId].indexPatternId === source.indexPatternId;
  const newOperation = getNewOperation(source.field, target.filterOperations, targetColumn);

  if (isTheSameIndexPattern && newOperation) {
    const nextLabel = operationDisplay[newOperation].displayName;

    if (!targetColumn) {
      return { dropTypes: ['field_add'], nextLabel };
    } else if (
      (hasField(targetColumn) && targetColumn.sourceField !== source.field.name) ||
      !hasField(targetColumn)
    ) {
      const layerDataView = indexPatterns[state.layers[target.layerId].indexPatternId];
      return hasField(targetColumn) &&
        layerDataView &&
        hasOperationSupportForMultipleFields(layerDataView, targetColumn, undefined, source.field)
        ? {
            dropTypes: ['field_replace', 'field_combine'],
          }
        : {
            dropTypes: ['field_replace'],
            nextLabel,
          };
    }
  }
  return;
}

function getDropPropsForCompatibleGroup(
  sourceProps: DataViewDragDropOperation,
  targetProps: DataViewDragDropOperation
): DropProps {
  if (!targetProps.column) {
    return { dropTypes: ['move_compatible', 'duplicate_compatible'] };
  }
  const canSwap = sourceProps.filterOperations?.(targetProps.column);
  const swapType: DropType[] = canSwap ? ['swap_compatible'] : [];

  const dropTypes: DropType[] = ['replace_compatible', 'replace_duplicate_compatible', ...swapType];
  if (!targetProps.dataView || !hasField(targetProps.column)) {
    return { dropTypes };
  }

  if (
    hasOperationSupportForMultipleFields(
      targetProps.dataView,
      targetProps.column,
      sourceProps.column
    )
  ) {
    dropTypes.push('combine_compatible');
  }
  return {
    dropTypes,
  };
}

function getDropPropsFromIncompatibleGroup(
  sourceProps: DataViewDragDropOperation,
  targetProps: DataViewDragDropOperation
): DropProps {
  if (!targetProps.dataView || !sourceProps.column) {
    return;
  }
  const sourceField = getField(sourceProps.column, sourceProps.dataView);
  const newOperationForSource = getNewOperation(
    sourceField,
    targetProps.filterOperations,
    targetProps.column
  );

  if (newOperationForSource) {
    const targetField = getField(targetProps.column, targetProps.dataView);
    const canSwap = Boolean(
      getNewOperation(targetField, sourceProps.filterOperations, sourceProps.column)
    );

    const dropTypes: DropType[] = [];
    if (targetProps.column) {
      dropTypes.push('replace_incompatible', 'replace_duplicate_incompatible');
      if (canSwap) {
        dropTypes.push('swap_incompatible');
      }
      if (
        hasOperationSupportForMultipleFields(
          targetProps.dataView,
          targetProps.column,
          sourceProps.column
        )
      ) {
        dropTypes.push('combine_incompatible');
      }
    } else {
      dropTypes.push('move_incompatible', 'duplicate_incompatible');
    }

    return {
      dropTypes,
      nextLabel: operationDisplay[newOperationForSource].displayName,
    };
  }
}
