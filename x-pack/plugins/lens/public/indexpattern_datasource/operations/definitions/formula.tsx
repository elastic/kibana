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
import { getColumnOrder } from '../layer_helpers';
import { mathOperation } from './math';

export interface FormulaIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'formula';
  params: {
    ast?: unknown;
    // last value on numeric fields can be formatted
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

export const formulaOperation: OperationDefinition<
  FormulaIndexPatternColumn,
  'managedReference'
> = {
  type: 'formula',
  displayName: 'Formula',
  getDefaultLabel: (column, indexPattern) => 'Formula',
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
                    expression: [
                      `${(layer.columns[columnId] as FormulaIndexPatternColumn).references[0]}`,
                    ],
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
      label: 'Formula',
      dataType: 'number',
      operationType: 'formula',
      isBucketed: false,
      scale: 'ratio',
      params: {},
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern) => {
    // TODO has to check all children
    return true;
  },

  paramEditor: function ParamEditor({
    layer,
    updateLayer,
    columnId,
    currentColumn,
    indexPattern,
    operationDefinitionMap,
  }) {
    const [text, setText] = useState(currentColumn.params.ast);
    return (
      <>
        <EuiTextArea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
        <EuiButton
          onClick={() => {
            const ast = parse(text);
            /*
            { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
            */
            const extracted = extractColumns(
              columnId,
              operationDefinitionMap,
              ast,
              layer,
              indexPattern
            );

            const columns = {
              ...layer.columns,
            };

            Object.keys(columns).forEach((k) => {
              if (k.startsWith(columnId)) {
                delete columns[k];
              }
            });

            extracted.forEach((extractedColumn, index) => {
              columns[`${columnId}X${index}`] = extractedColumn;
            });

            columns[columnId] = {
              ...currentColumn,
              params: {
                ...currentColumn.params,
                ast: text,
              },
              references: [`${columnId}X${extracted.length - 1}`],
            };

            updateLayer({
              ...layer,
              columns,
              columnOrder: getColumnOrder({
                ...layer,
                columns,
              }),
            });

            // TODO
            // turn ast into referenced columns
            // set state
          }}
        >
          Submit
        </EuiButton>
      </>
    );
  },
};

function extractColumns(
  idPrefix: string,
  operations: Record<string, GenericOperationDefinition>,
  ast: any,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
) {
  const columns: IndexPatternColumn[] = [];
  // let currentTree: any  = cloneDeep(ast);
  function parseNode(node: any) {
    if (typeof node === 'number' || typeof node === 'string') {
      // leaf node
      return node;
    }
    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      // it's a regular math node
      const consumedArgs = node.args.map((childNode: any) => parseNode(childNode));
      return {
        ...node,
        args: consumedArgs,
      };
    }
    // operation node
    if (nodeOperation.input === 'field') {
      const fieldName = node.args[0];
      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'field'
      >).buildColumn({
        layer,
        indexPattern,
        field: indexPattern.getFieldByName(fieldName)!,
      });
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push(newCol);
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'fullReference') {
      const consumedParam = parseNode(node.args[0]);
      const variables = findVariables(consumedParam);
      const mathColumn = mathOperation.buildColumn({
        layer,
        indexPattern,
      });
      mathColumn.references = variables;
      mathColumn.params.tinymathAst = consumedParam;
      columns.push(mathColumn);
      mathColumn.customLabel = true;
      mathColumn.label = `${idPrefix}X${columns.length - 1}`;
      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'fullReference'
      >).buildColumn({
        layer,
        indexPattern,
        referenceIds: [`${idPrefix}X${columns.length - 1}`],
      });
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push(newCol);
      // replace by new column id
      return `${idPrefix}X${columns.length - 1}`;
    }

    throw new Error('unexpected node');
  }
  const root = parseNode(ast);
  const variables = findVariables(root);
  const mathColumn = mathOperation.buildColumn({
    layer,
    indexPattern,
  });
  mathColumn.references = variables;
  mathColumn.params.tinymathAst = root;
  const newColId = `${idPrefix}X${columns.length}`;
  mathColumn.customLabel = true;
  mathColumn.label = newColId;
  columns.push(mathColumn);
  return columns;
}

// traverse a tree and find all string leaves
function findVariables(node: any): string[] {
  if (typeof node === 'string') {
    // leaf node
    return [node];
  }
  if (typeof node === 'number') {
    return [];
  }
  return node.args.flatMap(findVariables);
}
