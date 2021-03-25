/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasourceDimensionDropProps,
  isDraggedOperation,
  DraggedOperation,
  DropType,
} from '../../../types';
import { getOperationDisplay } from '../../operations';
import { hasField, isDraggedField } from '../../utils';
import { DragContextState } from '../../../drag_drop/providers';
import { OperationMetadata } from '../../../types';
import { getOperationTypesForField } from '../../operations';
import { IndexPatternColumn } from '../../indexpattern';
import {
  IndexPatternPrivateState,
  IndexPattern,
  IndexPatternField,
  DraggedField,
} from '../../types';

type GetDropProps = DatasourceDimensionDropProps<IndexPatternPrivateState> & {
  dragging?: DragContextState['dragging'];
  groupId: string;
};

type DropProps = { dropTypes: DropType[]; nextLabel?: string } | undefined;

const operationLabels = getOperationDisplay();

export function getNewOperation(
  field: IndexPatternField | undefined | false,
  filterOperations: (meta: OperationMetadata) => boolean,
  targetColumn: IndexPatternColumn
) {
  if (!field) {
    return;
  }
  const newOperations = getOperationTypesForField(field, filterOperations);
  if (!newOperations.length) {
    return;
  }
  // Detects if we can change the field only, otherwise change field + operation
  const shouldOperationPersist = targetColumn && newOperations.includes(targetColumn.operationType);
  return shouldOperationPersist ? targetColumn.operationType : newOperations[0];
}

export function getField(column: IndexPatternColumn | undefined, indexPattern: IndexPattern) {
  if (!column) {
    return;
  }
  const field = (hasField(column) && indexPattern.getFieldByName(column.sourceField)) || undefined;
  return field;
}

export function getDropProps(props: GetDropProps) {
  const { state, columnId, layerId, dragging, groupId, filterOperations } = props;
  if (!dragging) {
    return;
  }

  if (isDraggedField(dragging)) {
    return getDropPropsForField({ ...props, dragging });
  }

  if (
    isDraggedOperation(dragging) &&
    dragging.layerId === layerId &&
    columnId !== dragging.columnId
  ) {
    const sourceColumn = state.layers[dragging.layerId].columns[dragging.columnId];
    const targetColumn = state.layers[layerId].columns[columnId];

    const isSameGroup = groupId === dragging.groupId;
    if (isSameGroup) {
      return getDropPropsForSameGroup(targetColumn);
    } else if (hasTheSameField(sourceColumn, targetColumn)) {
      return;
    } else if (filterOperations(sourceColumn)) {
      return getDropPropsForCompatibleGroup(targetColumn);
    } else {
      return getDropPropsFromIncompatibleGroup({ ...props, dragging });
    }
  }
}

function hasTheSameField(sourceColumn: IndexPatternColumn, targetColumn?: IndexPatternColumn) {
  return (
    targetColumn &&
    hasField(targetColumn) &&
    hasField(sourceColumn) &&
    targetColumn.sourceField === sourceColumn.sourceField
  );
}

function getDropPropsForField({
  state,
  columnId,
  layerId,
  dragging,
  filterOperations,
}: GetDropProps & { dragging: DraggedField }): DropProps {
  const targetColumn = state.layers[layerId].columns[columnId];
  const isTheSameIndexPattern = state.layers[layerId].indexPatternId === dragging.indexPatternId;
  const newOperation = getNewOperation(dragging.field, filterOperations, targetColumn);

  if (!!(isTheSameIndexPattern && newOperation)) {
    const nextLabel = operationLabels[newOperation].displayName;

    if (!targetColumn) {
      return { dropTypes: ['field_add'], nextLabel };
    } else if (
      (hasField(targetColumn) && targetColumn.sourceField !== dragging.field.name) ||
      !hasField(targetColumn)
    ) {
      return {
        dropTypes: ['field_replace'],
        nextLabel,
      };
    }
  }
  return;
}

function getDropPropsForSameGroup(targetColumn?: IndexPatternColumn): DropProps {
  return targetColumn ? { dropTypes: ['reorder'] } : { dropTypes: ['duplicate_compatible'] };
}

function getDropPropsForCompatibleGroup(targetColumn?: IndexPatternColumn): DropProps {
  return {
    dropTypes: targetColumn
      ? ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible']
      : ['move_compatible', 'duplicate_compatible'],
  };
}

function getDropPropsFromIncompatibleGroup({
  state,
  columnId,
  layerId,
  dragging,
  filterOperations,
}: GetDropProps & { dragging: DraggedOperation }): DropProps {
  const targetColumn = state.layers[layerId].columns[columnId];
  const sourceColumn = state.layers[dragging.layerId].columns[dragging.columnId];

  const layerIndexPattern = state.indexPatterns[state.layers[layerId].indexPatternId];
  const sourceField = getField(sourceColumn, layerIndexPattern);
  const newOperationForSource = getNewOperation(sourceField, filterOperations, targetColumn);

  if (newOperationForSource) {
    const targetField = getField(targetColumn, layerIndexPattern);
    const canSwap = !!getNewOperation(targetField, dragging.filterOperations, sourceColumn);

    return {
      dropTypes: targetColumn
        ? canSwap
          ? ['replace_incompatible', 'replace_duplicate_incompatible', 'swap_incompatible']
          : ['replace_incompatible', 'replace_duplicate_incompatible']
        : ['move_incompatible', 'duplicate_incompatible'],
      nextLabel: operationLabels[newOperationForSource].displayName,
    };
  }
}
