/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useContext, ReactElement } from 'react';
import { DragDrop, DragDropIdentifier, DragContext } from '../../../../drag_drop';
import {
  Datasource,
  VisualizationDimensionGroupConfig,
  isDraggedOperation,
  DropType,
} from '../../../../types';
import { LayerDatasourceDropProps } from '../types';
import {
  getCustomDropTarget,
  getAdditionalClassesOnDroppable,
  getAdditionalClassesOnEnter,
} from './drop_targets_utils';

export function DraggableDimensionButton({
  layerId,
  label,
  accessorIndex,
  groupIndex,
  layerIndex,
  columnId,
  group,
  groups,
  onDrop,
  onDragStart,
  onDragEnd,
  children,
  layerDatasourceDropProps,
  layerDatasource,
  registerNewButtonRef,
}: {
  layerId: string;
  groupIndex: number;
  layerIndex: number;
  onDrop: (
    droppedItem: DragDropIdentifier,
    dropTarget: DragDropIdentifier,
    dropType?: DropType
  ) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  group: VisualizationDimensionGroupConfig;
  groups: VisualizationDimensionGroupConfig[];
  label: string;
  children: ReactElement;
  layerDatasource: Datasource<unknown, unknown>;
  layerDatasourceDropProps: LayerDatasourceDropProps;
  accessorIndex: number;
  columnId: string;
  registerNewButtonRef: (id: string, instance: HTMLDivElement | null) => void;
}) {
  const { dragging } = useContext(DragContext);

  const dropProps = layerDatasource.getDropProps({
    ...layerDatasourceDropProps,
    dragging,
    columnId,
    filterOperations: group.filterOperations,
    groupId: group.groupId,
    dimensionGroups: groups,
  });

  const dropTypes = dropProps?.dropTypes;
  const nextLabel = dropProps?.nextLabel;
  const canDuplicate = !!(
    dropTypes &&
    (dropTypes.includes('replace_duplicate_incompatible') ||
      dropTypes.includes('replace_duplicate_compatible'))
  );

  const canSwap = !!(
    dropTypes &&
    (dropTypes.includes('swap_incompatible') || dropTypes.includes('swap_compatible'))
  );

  const canCombine = Boolean(
    dropTypes &&
      (dropTypes.includes('combine_compatible') ||
        dropTypes.includes('field_combine') ||
        dropTypes.includes('combine_incompatible'))
  );

  const value = useMemo(
    () => ({
      columnId,
      groupId: group.groupId,
      layerId,
      id: columnId,
      filterOperations: group.filterOperations,
      humanData: {
        canSwap,
        canDuplicate,
        canCombine,
        label,
        groupLabel: group.groupLabel,
        position: accessorIndex + 1,
        nextLabel: nextLabel || '',
      },
    }),
    [
      columnId,
      group.groupId,
      accessorIndex,
      layerId,
      label,
      group.groupLabel,
      nextLabel,
      group.filterOperations,
      canDuplicate,
      canSwap,
      canCombine,
    ]
  );

  // todo: simplify by id and use drop targets?
  const reorderableGroup = useMemo(
    () =>
      group.accessors.map((g) => ({
        id: g.columnId,
      })),
    [group.accessors]
  );

  const registerNewButtonRefMemoized = useCallback(
    (el) => registerNewButtonRef(columnId, el),
    [registerNewButtonRef, columnId]
  );

  const handleOnDrop = useCallback(
    (droppedItem, selectedDropType) => onDrop(droppedItem, value, selectedDropType),
    [value, onDrop]
  );
  return (
    <div
      ref={registerNewButtonRefMemoized}
      className="lnsLayerPanel__dimensionContainer"
      data-test-subj={group.dataTestSubj}
    >
      <DragDrop
        getCustomDropTarget={getCustomDropTarget}
        getAdditionalClassesOnEnter={getAdditionalClassesOnEnter}
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        order={[2, layerIndex, groupIndex, accessorIndex]}
        draggable
        dragType={isDraggedOperation(dragging) ? 'move' : 'copy'}
        dropTypes={dropTypes}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        value={value}
        onDrop={handleOnDrop}
        onDragStart={() => onDragStart()}
        onDragEnd={() => onDragEnd()}
      >
        {children}
      </DragDrop>
    </div>
  );
}
