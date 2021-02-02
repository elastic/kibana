/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { DragDrop, DragDropIdentifier, DragContextState } from '../../../drag_drop';
import { Datasource, VisualizationDimensionGroupConfig, isDraggedOperation } from '../../../types';
import { LayerDatasourceDropProps } from './types';

const isFromTheSameGroup = (el1: DragDropIdentifier, el2?: DragDropIdentifier) =>
  el2 && isDraggedOperation(el2) && el1.groupId === el2.groupId && el1.columnId !== el2.columnId;

const isSelf = (el1: DragDropIdentifier, el2?: DragDropIdentifier) =>
  isDraggedOperation(el2) && el1.columnId === el2.columnId;

export function DraggableDimensionButton({
  layerId,
  label,
  accessorIndex,
  groupIndex,
  layerIndex,
  columnId,
  group,
  onDrop,
  children,
  dragDropContext,
  layerDatasourceDropProps,
  layerDatasource,
}: {
  dragDropContext: DragContextState;
  layerId: string;
  groupIndex: number;
  layerIndex: number;
  onDrop: (droppedItem: DragDropIdentifier, dropTarget: DragDropIdentifier) => void;
  group: VisualizationDimensionGroupConfig;
  label: string;
  children: React.ReactElement;
  layerDatasource: Datasource<unknown, unknown>;
  layerDatasourceDropProps: LayerDatasourceDropProps;
  accessorIndex: number;
  columnId: string;
}) {
  const value = useMemo(() => {
    return {
      columnId,
      groupId: group.groupId,
      layerId,
      id: columnId,
    };
  }, [columnId, group.groupId, layerId]);

  const { dragging } = dragDropContext;

  const isCurrentGroup = group.groupId === dragging?.groupId;
  const isOperationDragged = isDraggedOperation(dragging);
  const canHandleDrop =
    Boolean(dragDropContext.dragging) &&
    layerDatasource.canHandleDrop({
      ...layerDatasourceDropProps,
      columnId,
      filterOperations: group.filterOperations,
    });

  const dragType = isSelf(value, dragging)
    ? 'move'
    : isOperationDragged && isCurrentGroup
    ? 'reorder'
    : 'copy';

  const dropType = isOperationDragged ? (!isCurrentGroup ? 'replace' : 'reorder') : 'add';

  const isCompatibleFromOtherGroup = !isCurrentGroup && canHandleDrop;

  const isDroppable = isOperationDragged
    ? dragType === 'reorder'
      ? isFromTheSameGroup(value, dragging)
      : isCompatibleFromOtherGroup
    : canHandleDrop;

  const reorderableGroup = useMemo(
    () =>
      group.accessors.map((a) => ({
        columnId: a.columnId,
        id: a.columnId,
        groupId: group.groupId,
        layerId,
      })),
    [group, layerId]
  );

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        noKeyboardSupportYet={reorderableGroup.length < 2} // to be removed when navigating outside of groups is added
        draggable
        dragType={dragType}
        dropType={dropType}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        value={value}
        label={label}
        droppable={dragging && isDroppable}
        onDrop={onDrop}
      >
        {children}
      </DragDrop>
    </div>
  );
}
