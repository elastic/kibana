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

const getAdditionalClassesOnEnter = (dropType?: string) => {
  if (
    dropType === 'field_replace' ||
    dropType === 'replace_compatible' ||
    dropType === 'replace_incompatible'
  ) {
    return 'lnsDragDrop-isReplacing';
  }
};

const getAdditionalClassesOnDroppable = (dropType?: string) => {
  if (dropType === 'move_incompatible' || dropType === 'replace_incompatible') {
    return 'lnsDragDrop-notCompatible';
  }
};

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
  const dropType = layerDatasource.getDropTypes({
    ...layerDatasourceDropProps,
    columnId,
    filterOperations: group.filterOperations,
    groupId: group.groupId,
  });

  const value = useMemo(
    () => ({
      columnId,
      groupId: group.groupId,
      layerId,
      id: columnId,
      dropType,
      humanData: {
        label,
        groupLabel: group.groupLabel,
        position: accessorIndex + 1,
      },
    }),
    [columnId, group.groupId, accessorIndex, layerId, dropType, label, group.groupLabel]
  );

  // todo: simplify by id?
  const reorderableGroup = useMemo(
    () =>
      group.accessors.map((g, index) => ({
        columnId: g.columnId,
        id: g.columnId,
        groupId: group.groupId,
        dropType: 'reorder',
        humanData: {
          label: `item ${index + 1}`,
          groupLabel: group.groupLabel,
          position: index + 1,
        },
        layerId,
      })),
    [group, layerId]
  );

  const { dragging } = dragDropContext;

  const filterSameGroup = useMemo(
    () => (el?: DragDropIdentifier) => {
      return !!(!el || !isFromTheSameGroup(value, el) || el.isNew);
    },
    [value]
  );

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        getAdditionalClassesOnEnter={getAdditionalClassesOnEnter}
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        order={[2, layerIndex, groupIndex, accessorIndex]}
        draggable
        dragType={isSelf(value, dragging) ? 'move' : 'copy'}
        dropType={dropType}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        dropTargetsFilter={filterSameGroup}
        value={value}
        label={label}
        droppable={!!(dragging && dropType)}
        onDrop={(drag) => onDrop(drag, value, dropType)}
      >
        {children}
      </DragDrop>
    </div>
  );
}
