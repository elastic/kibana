/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { DragDrop, DragDropIdentifier, DragContextState } from '../../../drag_drop';
import {
  Datasource,
  VisualizationDimensionGroupConfig,
  isDraggedOperation,
  DropType,
} from '../../../types';
import { LayerDatasourceDropProps } from './types';

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
  onDrop: (
    droppedItem: DragDropIdentifier,
    dropTarget: DragDropIdentifier,
    dropType?: DropType
  ) => void;
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

  // todo: simplify by id and use drop targets?
  const reorderableGroup = useMemo(
    () =>
      group.accessors.map((g, index) => {
        const val = {
          columnId: g.columnId,
          layerId,
          groupId: group.groupId,
          id: g.columnId,
          dropType: 'reorder' as DropType,
          humanData: {
            label: `item ${index + 1}`,
            groupLabel: group.groupLabel,
            position: index + 1,
          },
        };
        const handleDrop = (drag: DragDropIdentifier, selectedDropType?: DropType) =>
          onDrop(drag, val, selectedDropType);
        return { ...val, onDrop: handleDrop };
      }),
    [group, layerId, onDrop]
  );

  const filterSameGroup = useMemo(
    () => (el?: DragDropIdentifier) =>
      !!(!el || !reorderableGroup.some((el2) => el2.id === el.id && el.id !== value.id)),
    [value, reorderableGroup]
  );

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        getAdditionalClassesOnEnter={getAdditionalClassesOnEnter}
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        order={[2, layerIndex, groupIndex, accessorIndex]}
        draggable
        dragType={isDraggedOperation(dragDropContext.dragging) ? 'move' : 'copy'}
        dropType={dropType}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        dropTargetsFilter={filterSameGroup}
        value={value}
        onDrop={(drag: DragDropIdentifier, selectedDropType?: DropType) =>
          onDrop(drag, value, selectedDropType)
        }
      >
        {children}
      </DragDrop>
    </div>
  );
}
