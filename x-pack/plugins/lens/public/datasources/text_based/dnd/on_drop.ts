/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextBasedLayerColumn, TextBasedPrivateState } from '../types';
import { reorderElements } from '../../../utils';
import { DatasourceDimensionDropHandlerProps, isOperation } from '../../../types';
import { removeColumn } from '../remove_column';

export const onDrop = (props: DatasourceDimensionDropHandlerProps<TextBasedPrivateState>) => {
  const { dropType, state, source, target } = props;
  if (
    ![
      'field_add',
      'field_replace',
      'duplicate_compatible',
      'replace_duplicate_compatible',
      'replace_compatible',
      'move_compatible',
      'swap_compatible',
      'reorder',
    ].includes(dropType)
  ) {
    return undefined;
  }

  const layer = state.layers[target.layerId];
  const sourceField = layer.allColumns.find((f) => f.columnId === source.id);
  const targetField = layer.allColumns.find((f) => f.columnId === target.columnId);
  const newColumn = {
    columnId: target.columnId,
    fieldName: sourceField?.fieldName ?? '',
    meta: sourceField?.meta,
  };
  let columns: TextBasedLayerColumn[] | undefined;
  let allColumns: TextBasedLayerColumn[] | undefined;

  switch (dropType) {
    case 'field_add':
    case 'duplicate_compatible':
    case 'replace_duplicate_compatible':
      columns = [...layer.columns.filter((c) => c.columnId !== target.columnId), newColumn];
      allColumns = [...layer.allColumns.filter((c) => c.columnId !== target.columnId), newColumn];
      break;
    case 'field_replace':
    case 'replace_compatible':
      columns = layer.columns.map((c) => (c.columnId === target.columnId ? newColumn : c));
      allColumns = layer.allColumns.map((c) => (c.columnId === target.columnId ? newColumn : c));
      break;
    case 'move_compatible':
      columns = [...layer.columns, newColumn];
      allColumns = [...layer.allColumns, newColumn];
      break;
    case 'swap_compatible':
      const swapTwoColumns = (c: TextBasedLayerColumn) =>
        c.columnId === target.columnId
          ? newColumn
          : c.columnId === source.columnId
          ? {
              columnId: source.columnId,
              fieldName: targetField?.fieldName ?? '',
              meta: targetField?.meta,
            }
          : c;
      columns = layer.columns.map(swapTwoColumns);
      allColumns = layer.allColumns.map(swapTwoColumns);
      break;
    case 'reorder':
      const targetColumn = layer.columns.find((f) => f.columnId === target.columnId);
      const sourceColumn = layer.columns.find((f) => f.columnId === source.id);
      if (!targetColumn || !sourceColumn) return;
      columns = reorderElements(layer.columns, targetColumn, sourceColumn);
      allColumns = reorderElements(layer.allColumns, targetColumn, sourceColumn);
      break;
  }

  if (!columns || !allColumns) return;

  const newState = {
    ...props.state,
    layers: {
      ...props.state.layers,
      [target.layerId]: {
        ...layer,
        columns,
        allColumns,
      },
    },
  };
  if (isOperation(source) && ['replace_compatible', 'move_compatible'].includes(dropType)) {
    return removeColumn({
      prevState: newState,
      columnId: source.columnId,
      layerId: source.layerId,
    });
  }
  return newState;
};
