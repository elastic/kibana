/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast } from '@kbn/interpreter';
import type { TimeRange } from '@kbn/es-query';
import { timerangeToAst, aggregateQueryToAst } from '@kbn/data-plugin/common';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { OriginalColumn } from '../../common/types';
import { EsSQLPrivateState, EsSQLLayer, IndexPatternRef } from './types';

function getExpressionForLayer(
  layer: EsSQLLayer,
  refs: IndexPatternRef[],
  timeRange?: TimeRange
): Ast | null {
  if (!layer.columns || layer.columns?.length === 0) {
    return null;
  }

  let idMapper: Record<string, OriginalColumn[]> = {};
  layer.allColumns.forEach((col) => {
    if (idMapper[col.fieldName]) {
      idMapper[col.fieldName].push({
        id: col.columnId,
        label: col.customLabel ?? col.fieldName,
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

  // const idMap = layer.columns.reduce((currentIdMap, column, index) => {
  //   return {
  //     ...currentIdMap,
  //     [column.fieldName]: [
  //       {
  //         id: column.columnId,
  //       },
  //     ],
  //   };
  // });

  const kibana = buildExpressionFunction('kibana', {});
  const kibanaContext = buildExpressionFunction('kibana_context', {
    timeRange: timeRange && timerangeToAst(timeRange),
  });
  const ast = buildExpression([kibana, kibanaContext]).toAst();
  const timeFieldName = refs.find((r) => r.id === layer.index)?.timeField;
  if (layer.query) {
    const essql = aggregateQueryToAst(layer.query, timeFieldName);

    if (essql) {
      ast.chain.push(essql);
    }
  }

  ast.chain.push({
    type: 'function',
    function: 'lens_map_to_columns',
    arguments: {
      idMap: [JSON.stringify(idMapper)],
    },
  });
  return ast;
}

export function toExpression(state: EsSQLPrivateState, layerId: string, timeRange?: TimeRange) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId], state.indexPatternRefs, timeRange);
  }

  return null;
}
