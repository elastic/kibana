/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, ReactElement } from 'react';
import {
  DragDrop,
  DragDropIdentifier,
  useDragDropContext,
  DropType,
  DropTargetSwapDuplicateCombine,
} from '@kbn/dom-drag-drop';
import { isDraggedField } from '../../../../utils';
import {
  Datasource,
  VisualizationDimensionGroupConfig,
  isOperation,
  DatasourceLayers,
  IndexPatternMap,
  DragDropOperation,
  Visualization,
} from '../../../../types';

export function DraggableDimensionButton({
  order,
  group,
  onDrop,
  activeVisualization,
  onDragStart,
  onDragEnd,
  children,
  state,
  layerDatasource,
  datasourceLayers,
  registerNewButtonRef,
  indexPatterns,
  target,
}: {
  target: DragDropOperation & {
    id: string;
    humanData: {
      label: string;
      groupLabel: string;
      position: number;
      layerNumber: number;
    };
  };
  order: [2, number, number, number];
  onDrop: (source: DragDropIdentifier, dropTarget: DragDropIdentifier, dropType?: DropType) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  activeVisualization: Visualization<unknown, unknown>;
  group: VisualizationDimensionGroupConfig;
  children: ReactElement;
  layerDatasource?: Datasource<unknown, unknown>;
  datasourceLayers: DatasourceLayers;
  state: unknown;
  registerNewButtonRef: (id: string, instance: HTMLDivElement | null) => void;
  indexPatterns: IndexPatternMap;
}) {
  const [{ dragging }] = useDragDropContext();

  let getDropProps;

  if (dragging) {
    if (!layerDatasource) {
      getDropProps = activeVisualization.getDropProps;
    } else if (
      isDraggedField(dragging) ||
      (isOperation(dragging) &&
        layerDatasource &&
        datasourceLayers?.[dragging.layerId]?.datasourceId ===
          datasourceLayers?.[target.layerId]?.datasourceId)
    ) {
      getDropProps = layerDatasource.getDropProps;
    }
  }

  const { dropTypes, nextLabel } = getDropProps?.({
    state,
    source: dragging,
    target,
    indexPatterns,
  }) || { dropTypes: [], nextLabel: '' };

  const canDuplicate = !!(
    dropTypes.includes('replace_duplicate_incompatible') ||
    dropTypes.includes('replace_duplicate_compatible')
  );

  const canSwap = !!(
    dropTypes.includes('swap_incompatible') || dropTypes.includes('swap_compatible')
  );

  const canCombine = Boolean(
    dropTypes.includes('combine_compatible') ||
      dropTypes.includes('field_combine') ||
      dropTypes.includes('combine_incompatible')
  );

  const value = useMemo(
    () => ({
      ...target,
      humanData: {
        ...target.humanData,
        canSwap,
        canDuplicate,
        canCombine,
        nextLabel: nextLabel || '',
      },
    }),
    [target, nextLabel, canDuplicate, canSwap, canCombine]
  );

  const reorderableGroup = useMemo(
    () =>
      group.accessors.map((g) => ({
        id: g.columnId,
      })),
    [group.accessors]
  );

  const registerNewButtonRefMemoized = useCallback(
    (el) => registerNewButtonRef(target.columnId, el),
    [registerNewButtonRef, target.columnId]
  );

  const handleOnDrop = useCallback(
    (source, selectedDropType) => onDrop(source, value, selectedDropType),
    [value, onDrop]
  );
  return (
    <div
      ref={registerNewButtonRefMemoized}
      className="lnsLayerPanel__dimensionContainer"
      data-test-subj={group.dataTestSubj}
    >
      <DragDrop
        draggable
        getCustomDropTarget={DropTargetSwapDuplicateCombine.getCustomDropTarget}
        getAdditionalClassesOnEnter={DropTargetSwapDuplicateCombine.getAdditionalClassesOnEnter}
        getAdditionalClassesOnDroppable={
          DropTargetSwapDuplicateCombine.getAdditionalClassesOnDroppable
        }
        order={order}
        dragType={isOperation(dragging) ? 'move' : 'copy'}
        dropTypes={dropTypes}
        reorderableGroup={reorderableGroup.length > 1 ? reorderableGroup : undefined}
        value={value}
        onDrop={handleOnDrop}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {children}
      </DragDrop>
    </div>
  );
}
