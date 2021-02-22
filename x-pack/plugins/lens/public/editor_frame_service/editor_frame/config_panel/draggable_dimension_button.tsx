/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useContext, ReactElement } from 'react';
import { DragDrop, DragDropIdentifier, DragContext } from '../../../drag_drop';

import { EuiIcon, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import {
  Datasource,
  VisualizationDimensionGroupConfig,
  isDraggedOperation,
  DropType,
} from '../../../types';
import { LayerDatasourceDropProps } from './types';


const customDropTargetsMap = {
  replace_duplicate_compatible: (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="center"
      alignItems="center"
      className="lnsDragDrop__extraDrop"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type="copy" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Duplicate</EuiFlexItem>
    </EuiFlexGroup>
  ),
  duplicate_compatible: (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="center"
      alignItems="center"
      className="lnsDragDrop__extraDrop"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type="copy" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Duplicate</EuiFlexItem>
    </EuiFlexGroup>
  ),
  swap_compatible: (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="center"
      alignItems="center"
      className="lnsDragDrop__extraDrop"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type="expand" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Swap</EuiFlexItem>
    </EuiFlexGroup>
  ),
  replace_duplicate_incompatible: (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="center"
      alignItems="center"
      className="lnsDragDrop__extraDrop lnsDragDrop__extraDrop-incompatible"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type="copy" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Duplicate</EuiFlexItem>
    </EuiFlexGroup>
  ),
  duplicate_incompatible: (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="center"
      alignItems="center"
      className="lnsDragDrop__extraDrop lnsDragDrop__extraDrop-incompatible"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type="copy" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Duplicate</EuiFlexItem>
    </EuiFlexGroup>
  ),
  swap_incompatible: (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="center"
      alignItems="center"
      className="lnsDragDrop__extraDrop lnsDragDrop__extraDrop-incompatible"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type="expand" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>Swap</EuiFlexItem>
    </EuiFlexGroup>
  ),
};


const getAdditionalClassesOnEnter = (dropType?: string) => {
  if (
    dropType &&
    [
      'field_replace',
      'replace_compatible',
      'replace_incompatible',
      'replace_duplicate_compatible',
      'replace_duplicate_incompatible',
    ].includes(dropType)
  ) {
    return 'lnsDragDrop-isReplacing';
  }
};

const getAdditionalClassesOnDroppable = (dropType?: string) => {
  if (
    dropType &&
    [
      'move_incompatible',
      'replace_incompatible',
      'swap_incompatible',
      'duplicate_incompatible',
      'replace_duplicate_incompatible',
    ].includes(dropType)
  ) {
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

  const value = useMemo(
    () => ({
      columnId,
      groupId: group.groupId,
      layerId,
      id: columnId,
      filterOperations: group.filterOperations,
      humanData: {
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

  const registerNewButtonRefMemoized = useCallback((el) => registerNewButtonRef(columnId, el), [
    registerNewButtonRef,
    columnId,
  ]);

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
        customDropTargets={customDropTargetsMap}
        getAdditionalClassesOnEnter={getAdditionalClassesOnEnter}
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        order={[2, layerIndex, groupIndex, accessorIndex]}
        draggable
        dragType={isDraggedOperation(dragging) ? 'move' : 'copy'}
        dropTypes={dropTypes}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        value={value}
        onDrop={handleOnDrop}
      >
        {children}
      </DragDrop>
    </div>
  );
}
