/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinymathAST } from '@kbn/tinymath';
import { OperationDefinition } from '../index';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern } from '../../../types';

export interface MathIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'math';
  params: {
    tinymathAst: TinymathAST | string;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const mathOperation: OperationDefinition<MathIndexPatternColumn, 'managedReference'> = {
  type: 'math',
  displayName: 'Math',
  hidden: true,
  getDefaultLabel: (column, indexPattern) => 'Math',
  input: 'managedReference',
  getDisabledStatus(indexPattern: IndexPattern) {
    return undefined;
  },
  getPossibleOperation() {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  toExpression: (layer, columnId) => {
    const column = layer.columns[columnId] as MathIndexPatternColumn;
    return [
      {
        type: 'function',
        function: 'mapColumn',
        arguments: {
          name: [columnId],
          exp: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'math',
                  arguments: {
                    expression: [astToString(column.params.tinymathAst)],
                  },
                },
              ],
            },
          ],
        },
      },
    ];
  },
  buildColumn() {
    return {
      label: 'Math',
      dataType: 'number',
      operationType: 'math',
      isBucketed: false,
      scale: 'ratio',
      params: {
        tinymathAst: '',
      },
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern) => {
    // TODO has to check all children
    return true;
  },
};

function astToString(ast: TinymathAST | string): string | number {
  if (typeof ast === 'number' || typeof ast === 'string') {
    return ast;
  }
  if (ast.type === 'variable') {
    return ast.value;
  }
  if (ast.type === 'namedArgument') {
    return `${ast.name}=${ast.value}`;
  }
  return `${ast.name}(${ast.args.map(astToString).join(',')})`;
}
