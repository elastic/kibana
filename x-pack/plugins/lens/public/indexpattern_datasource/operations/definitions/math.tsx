/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { parse } from 'tinymath';
import { EuiButton, EuiTextArea } from '@elastic/eui';
import { OperationDefinition, GenericOperationDefinition, IndexPatternColumn } from './index';
import { ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPattern, IndexPatternLayer } from '../../types';

export interface MathIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'math';
  params: {
    tinymathAst: any;
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
  getErrorMessage(layer, columnId, indexPattern) {
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
        tinymathAst: {},
      },
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern) => {
    // TODO has to check all children
    return true;
  },
};

function astToString(ast: any) {
  if (typeof ast === 'number' || typeof ast === 'string') {
    return ast;
  }
  return `${ast.name}(${ast.args.map(astToString).join(',')})`;
}
