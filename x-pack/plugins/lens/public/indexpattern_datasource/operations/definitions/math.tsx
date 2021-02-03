/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import type { TinymathAST, TinymathFunction } from '@kbn/tinymath';
import { isObject } from 'lodash';
import { OperationDefinition, GenericOperationDefinition } from './index';
import { ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPattern, IndexPatternLayer } from '../../types';

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
  getErrorMessage(layer, columnId, indexPattern, operationDefinitionMap) {
    const column = layer.columns[columnId] as MathIndexPatternColumn;
    if (!column.params.tinymathAst || !operationDefinitionMap) {
      return;
    }
    const errors: string[] = [];
    if (typeof column.params.tinymathAst !== 'string') {
      const node = getMathNode(layer, column.params.tinymathAst);
      if (node) {
        const missingOperations = hasInvalidOperations(node, operationDefinitionMap);
        if (missingOperations.length) {
          errors.push(
            i18n.translate('xpack.lens.indexPattern.operationsNotFound', {
              defaultMessage:
                '{operationLength, plural, one {Operation} other {Operations}} {operationsList} not found',
              values: {
                operationLength: missingOperations.length,
                operationsList: missingOperations.join(', '),
              },
            })
          );
        }
        const missingVariables = findVariables(node).filter(
          (variable) => !indexPattern.getFieldByName(variable) && !layer.columns[variable]
        );
        // need to check the arguments here: check only strings for now

        errors.push(
          i18n.translate('xpack.lens.indexPattern.fieldNotFound', {
            defaultMessage:
              '{variablesLength, plural, one {Field} other {Fields}} {variablesList} not found',
            values: {
              variablesLength: missingOperations.length,
              variablesList: missingVariables.join(', '),
            },
          })
        );
      }
    }
    return errors.length ? errors : undefined;
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

function findMathNodes(
  root: TinymathAST | string,
  operations: Record<string, GenericOperationDefinition>
): TinymathFunction[] {
  function flattenMathNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function' || operations[node.name]) {
      return [];
    }
    return [node, ...node.args.flatMap(flattenMathNodes)].filter(Boolean);
  }
  return flattenMathNodes(root);
}

export function hasMathNode(
  root: TinymathAST,
  operations: Record<string, GenericOperationDefinition>
): boolean {
  return Boolean(findMathNodes(root, operations).length);
}

function hasInvalidOperations(
  node: TinymathAST | string,
  operations: Record<string, GenericOperationDefinition>
) {
  // avoid duplicates
  return Array.from(
    new Set(
      findMathNodes(node, operations)
        .filter(({ name }) => !tinymathValidOperators.has(name))
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

function getMathNode(layer: IndexPatternLayer, ast: TinymathAST | string) {
  if (typeof ast === 'string') {
    const refColumn = layer.columns[ast];
    if (refColumn && 'sourceField' in refColumn) {
      return refColumn.sourceField;
    }
  }
  return ast;
}
