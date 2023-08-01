/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DropType } from '@kbn/dom-drag-drop';
import { isOperation } from '../../../types';
import type { TextBasedPrivateState } from '../types';
import type { GetDropPropsArgs } from '../../../types';
import { isDraggedField, isOperationFromTheSameGroup } from '../../../utils';

export const getDropProps = (
  props: GetDropPropsArgs<TextBasedPrivateState>
): { dropTypes: DropType[]; nextLabel?: string } | undefined => {
  const { source, target, state } = props;
  if (!source || source.id === target.columnId) {
    return;
  }
  const layer = state.layers[target.layerId];
  const targetColumn = layer.columns.find((f) => f.columnId === target.columnId);
  const targetField = layer.allColumns.find((f) => f.columnId === target.columnId);
  const sourceField = layer.allColumns.find((f) => f.columnId === source.id);

  if (isDraggedField(source)) {
    const nextLabel = source.humanData.label;
    if (target?.isMetricDimension && sourceField?.meta?.type !== 'number') {
      return;
    }
    return {
      dropTypes: [targetColumn ? 'field_replace' : 'field_add'],
      nextLabel,
    };
  }

  if (isOperation(source)) {
    if (source.layerId !== target.layerId) return;
    const nextLabel = source.humanData.label;
    if (isOperationFromTheSameGroup(source, target)) {
      if (!targetColumn) {
        return { dropTypes: ['duplicate_compatible'], nextLabel };
      }
      return { dropTypes: ['reorder'], nextLabel };
    }

    const isMoveable =
      !target?.isMetricDimension ||
      (target.isMetricDimension && sourceField?.meta?.type === 'number');

    if (targetColumn) {
      const isSwappable =
        (isMoveable && !source?.isMetricDimension) ||
        (source.isMetricDimension && targetField?.meta?.type === 'number');
      if (isMoveable) {
        if (isSwappable) {
          return {
            dropTypes: ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible'],
            nextLabel,
          };
        }
        return {
          dropTypes: ['replace_compatible', 'replace_duplicate_compatible'],
          nextLabel,
        };
      }
    } else {
      if (isMoveable) {
        return {
          dropTypes: ['move_compatible', 'duplicate_compatible'],
          nextLabel,
        };
      }
    }
  }
  return;
};
