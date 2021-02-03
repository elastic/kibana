/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { TinymathAST, TinymathFunction } from '@kbn/tinymath';
import { isObject } from 'lodash';
import { OperationDefinition, GenericOperationDefinition } from './index';
import { ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPattern } from '../../types';

const tinymathValidOperators = new Set(['add', 'subtract', 'multiply', 'divide']);

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

export function isMathNode(node: TinymathAST) {
  return isObject(node) && node.type === 'function' && tinymathValidOperators.has(node.name);
}

function findMathNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenMathNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function' || !isMathNode(node)) {
      return [];
    }
    return [node, ...node.args.flatMap(flattenMathNodes)].filter(Boolean);
  }
  return flattenMathNodes(root);
}

export function hasMathNode(root: TinymathAST): boolean {
  return Boolean(findMathNodes(root).length);
}

function findFunctionNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenFunctionNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    return [node, ...node.args.flatMap(flattenFunctionNodes)].filter(Boolean);
  }
  return flattenFunctionNodes(root);
}

export function hasInvalidOperations(
  node: TinymathAST | string,
  operations: Record<string, GenericOperationDefinition>
) {
  // avoid duplicates
  return Array.from(
    new Set(
      findFunctionNodes(node)
        .filter((v) => !isMathNode(v) && !operations[v.name])
        .map(({ name }) => name)
    )
  );
}

// traverse a tree and find all string leaves
export function findVariables(node: TinymathAST | string | undefined): string[] {
  if (node == null) {
    return [];
  }
  if (typeof node === 'string') {
    return [node];
  }
  if (typeof node === 'number' || node.type === 'namedArgument') {
    return [];
  }
  if (node.type === 'variable') {
    // leaf node
    return [node.value];
  }
  return node.args.flatMap(findVariables);
}
