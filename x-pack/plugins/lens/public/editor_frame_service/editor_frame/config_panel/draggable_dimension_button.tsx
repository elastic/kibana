/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useContext } from 'react';
import { DragDrop, DragDropIdentifier, DragContext } from '../../../drag_drop';

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
  groups,
  onDrop,
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
  group: VisualizationDimensionGroupConfig;
  groups: VisualizationDimensionGroupConfig[];
  label: string;
  children: React.ReactElement;
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

  const dropType = dropProps?.dropType;
  const nextLabel = dropProps?.nextLabel;

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
        nextLabel: nextLabel || '',
      },
    }),
    [columnId, group.groupId, accessorIndex, layerId, dropType, label, group.groupLabel, nextLabel]
  );

  // todo: simplify by id and use drop targets?
  const reorderableGroup = useMemo(
    () =>
      group.accessors.map((g) => ({
        id: g.columnId,
      })),
    [group.accessors]
  );

  const registerNewButtonRefMemoized = useCallback((el) => registerNewButtonRef(columnId, el), [
    registerNewButtonRef,
    columnId,
  ]);

  const handleOnDrop = React.useCallback(
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
        getAdditionalClassesOnEnter={getAdditionalClassesOnEnter}
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        order={[2, layerIndex, groupIndex, accessorIndex]}
        draggable
        dragType={isDraggedOperation(dragging) ? 'move' : 'copy'}
        dropType={dropType}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        value={value}
        onDrop={handleOnDrop}
      >
        {children}
      </DragDrop>
    </div>
  );
}
