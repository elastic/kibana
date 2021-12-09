/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Ast, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, EsSQLPrivateState, EsSQLLayer } from './types';
import { OriginalColumn } from './rename_columns';
import { dateHistogramOperation } from './operations/definitions';

function getExpressionForLayer(layer: EsSQLLayer, refs: any): Ast | null {
  if (layer.columns.length === 0) {
    return null;
  }

  const idMap = layer.columns.reduce((currentIdMap, column, index) => {
    return {
      ...currentIdMap,
      [column.fieldName]: {
        id: column.columnId,
      },
    };
  }, {} as Record<string, { id: string }>);

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'essql',
        arguments: {
          discardFilters: [layer.hideFilterBar],
          query: [layer.query],
          timefield: [refs.find((r) => r.id === layer.index)!.timeField],
        },
      },
      {
        type: 'function',
        function: 'lens_rename_columns',
        arguments: {
          idMap: [JSON.stringify(idMap)],
          overwriteTypes: layer.overwrittenFieldTypes
            ? [JSON.stringify(layer.overwrittenFieldTypes)]
            : [],
        },
      },
    ],
  };
}

export function toExpression(state: EsSQLPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId], state.indexPatternRefs);
  }

  return null;
}
