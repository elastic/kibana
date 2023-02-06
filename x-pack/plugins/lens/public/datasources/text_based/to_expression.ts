/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter';
import { textBasedQueryStateToExpressionAst } from '@kbn/data-plugin/common';
import type { OriginalColumn } from '../../../common/types';
import { TextBasedPrivateState, TextBasedLayer, IndexPatternRef } from './types';

function getExpressionForLayer(layer: TextBasedLayer, refs: IndexPatternRef[]): Ast | null {
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
  const timeFieldName = layer.timeField ?? undefined;

  const textBasedQueryToAst = textBasedQueryStateToExpressionAst({
    query: layer.query,
    timeFieldName,
  });

  textBasedQueryToAst.chain.push({
    type: 'function',
    function: 'lens_map_to_columns',
    arguments: {
      idMap: [JSON.stringify(idMapper)],
    },
  });
  return textBasedQueryToAst;
}

export function toExpression(state: TextBasedPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId], state.indexPatternRefs);
  }

  return null;
}
