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
import { IndexPattern, ExpressionBasedPrivateState, ExpressionBasedLayer } from './types';
import { OriginalColumn } from './rename_columns';
import { dateHistogramOperation } from './operations/definitions';
import { parseExpression } from '../../../../../src/plugins/expressions/common';

function getExpressionForLayer(layer: ExpressionBasedLayer, refs: any): Ast | null {
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
      ...parseExpression(layer.query).chain,
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

export function toExpression(state: ExpressionBasedPrivateState, layerId: string) {
  if (state.layers[layerId]) {
    return getExpressionForLayer(state.layers[layerId], state.indexPatternRefs);
  }

  return null;
}
