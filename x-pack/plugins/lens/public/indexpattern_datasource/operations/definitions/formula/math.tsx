/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinymathAST } from '@kbn/tinymath';
import { OperationDefinition } from '../index';
import { ValueFormatConfig, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern } from '../../../types';

export interface MathIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'math';
  params: {
    tinymathAst: TinymathAST | string;
    // last value on numeric fields can be formatted
    format?: ValueFormatConfig;
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
        function: 'mathColumn',
        arguments: {
          id: [columnId],
          name: [column.label],
          expression: [astToString(column.params.tinymathAst)],
          onError: ['null'],
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
  createCopy: (layer) => {
    return { ...layer };
  },
};

function astToString(ast: TinymathAST | string): string | number {
  if (typeof ast === 'number') {
    return ast;
  }
  if (typeof ast === 'string') {
    // Double quotes around uuids like 1234-5678X2 to avoid ambiguity
    return `"${ast}"`;
  }
  if (ast.type === 'variable') {
    return ast.value;
  }
  if (ast.type === 'namedArgument') {
    if (ast.name === 'kql' || ast.name === 'lucene') {
      return `${ast.name}='${ast.value}'`;
    }
    return `${ast.name}=${ast.value}`;
  }
  return `${ast.name}(${ast.args.map(astToString).join(',')})`;
}
