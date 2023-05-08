/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DragDropIdentifier, DropType } from '@kbn/dom-drag-drop';
import {
  FramePublicAPI,
  isOperation,
  Visualization,
  DragDropOperation,
  VisualizationDimensionGroupConfig,
} from '../../../../types';

export interface OnVisDropProps<T> {
  prevState: T;
  target: DragDropOperation;
  source: DragDropIdentifier;
  frame: FramePublicAPI;
  dropType: DropType;
  group?: VisualizationDimensionGroupConfig;
}

export function shouldRemoveSource(source: DragDropIdentifier, dropType: DropType) {
  return (
    isOperation(source) &&
    (dropType === 'move_compatible' ||
      dropType === 'move_incompatible' ||
      dropType === 'combine_incompatible' ||
      dropType === 'combine_compatible' ||
      dropType === 'replace_compatible' ||
      dropType === 'replace_incompatible')
  );
}

export function onDropForVisualization<T, P = unknown>(
  props: OnVisDropProps<T>,
  activeVisualization: Visualization<T, P>
) {
  const { prevState, target, frame, source, group } = props;
  const { layerId, columnId, groupId } = target;

  const previousColumn =
    isOperation(source) && group?.requiresPreviousColumnOnDuplicate ? source.columnId : undefined;

  const newVisState = activeVisualization.setDimension({
    columnId,
    groupId,
    layerId,
    prevState,
    previousColumn,
    frame,
  });

  return newVisState;
}
