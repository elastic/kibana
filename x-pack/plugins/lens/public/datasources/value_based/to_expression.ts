/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter';
import type { OriginalColumn } from '../../../common/types';
import { ValueBasedPrivateState, ValueBasedLayer } from './types';
function getExpressionForLayer(layer: ValueBasedLayer, layerId: string): Ast | null {
  if (!layer.columns || layer.columns?.length === 0) {
    return null;
  }

  let idMapper: Record<string, OriginalColumn[]> = {};
  layer.columns.forEach((col) => {
    if (idMapper[col.fieldName]) {
      idMapper[col.fieldName].push({
        id: col.columnId,
        label: col.fieldName,
      } as OriginalColumn);
    } else {
      idMapper = {
        ...idMapper,
        [col.fieldName]: [
          {
            id: col.columnId,
            label: col.fieldName,
          } as OriginalColumn,
        ],
      };
    }
  });

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'var',
        arguments: {
          name: [layerId],
        },
      },
      {
        type: 'function',
        function: 'lens_map_to_columns',
        arguments: {
          idMap: [JSON.stringify(idMapper)],
        },
      },
    ],
  };
}

export function toExpression(state: ValueBasedPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId], layerId);
  }

  return null;
}
