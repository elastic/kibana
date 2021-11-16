/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Ast, ExpressionFunctionAST } from '@kbn/interpreter/common';
import { IndexPatternColumn } from './indexpattern';
import { operationDefinitionMap } from './operations';
import { IndexPattern, EsDSLPrivateState, EsDSLLayer } from './types';
import { OriginalColumn } from './rename_columns';
import { dateHistogramOperation } from './operations/definitions';

function getExpressionForLayer(layer: EsDSLLayer): Ast | null {
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
        function: 'esdsl',
        arguments: {
          index: [layer.index],
          dsl: [layer.query],
        },
      },
      {
        type: 'function',
        function: 'lens_rename_columns',
        arguments: {
          idMap: [JSON.stringify(idMap)],
          overwrittenFieldTypes: layer.overwrittenFieldTypes
            ? [JSON.stringify(layer.overwrittenFieldTypes)]
            : [],
        },
      },
    ],
  };
}

export function toExpression(state: EsDSLPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId]);
  }

  return null;
}
