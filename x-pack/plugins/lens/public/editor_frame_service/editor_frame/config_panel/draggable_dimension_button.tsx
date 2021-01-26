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
  const dragType = isSelf(value, dragging)
    ? 'move'
    : isDraggedOperation(dragging) && group.groupId === dragging.groupId
    ? 'reorder'
    : 'copy';

  const dropType = isDraggedOperation(dragging)
    ? group.groupId !== dragging.groupId
      ? 'replace'
      : 'reorder'
    : 'add';

  const isCompatibleFromOtherGroup =
    dragging?.groupId !== group.groupId &&
    layerDatasource.canHandleDrop({
      ...layerDatasourceDropProps,
      columnId,
      filterOperations: group.filterOperations,
    });

  const isDroppable = isDraggedOperation(dragging)
    ? dragType === 'reorder'
      ? isFromTheSameGroup(value, dragging)
      : isCompatibleFromOtherGroup
    : layerDatasource.canHandleDrop({
        ...layerDatasourceDropProps,
        columnId,
        filterOperations: group.filterOperations,
      });

  const reorderableGroup = useMemo(() => {
    // if (group.accessors.length > 1) {
    return group.accessors.map((a) => ({
      columnId: a.columnId,
      id: a.columnId,
      groupId: group.groupId,
      layerId,
    }));
    // }
  }, [group, layerId]);

  const filterSameGroup = useMemo(
    () => (el?: DragDropIdentifier) => {
      return !!(!el || !isFromTheSameGroup(value, el) || el.isNew);
    },
    [value]
  );

  return (
    <div className="lnsLayerPanel__dimensionContainer">
      <DragDrop
        order={[2, layerIndex, groupIndex, accessorIndex]}
        draggable
        dragType={dragType}
        dropType={dropType}
        dataTestSubj={group.dataTestSubj}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        dropTargetsFilter={filterSameGroup}
        value={value}
        droppable={dragging && isDroppable}
        onDrop={onDrop}
      >
        {children}
      </DragDrop>
    </div>
  );
}
