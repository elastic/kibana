/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { parse } from '@kbn/tinymath';
import { EuiButton, EuiTextArea } from '@elastic/eui';
import { OperationDefinition, GenericOperationDefinition, IndexPatternColumn } from './index';
import { ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPattern, IndexPatternField, IndexPatternLayer } from '../../types';
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
  getErrorMessage(layer, columnId, indexPattern, operationDefinitionMap) {
    const column = layer.columns[columnId] as FormulaIndexPatternColumn;
    if (!column.params.ast || !operationDefinitionMap) {
      return;
    }
    const ast = parse(column.params.ast);
    const extracted = extractColumns(
      columnId,
      removeUnderscore(operationDefinitionMap),
      ast,
      layer,
      indexPattern
    );

    const errors = extracted
      .flatMap(({ operationType, label }) => {
        if (layer.columns[label]) {
          return operationDefinitionMap[operationType]?.getErrorMessage?.(
            layer,
            label,
            indexPattern,
            operationDefinitionMap
          );
        }
      })
      .filter(Boolean) as string[];
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
  buildColumn({ previousColumn, layer }) {
    let previousFormula = '';
    if (previousColumn) {
      if ('references' in previousColumn) {
        const metric = layer.columns[previousColumn.references[0]];
        const fieldName = getSafeFieldName(metric?.sourceField);
        // TODO need to check the input type from the definition
        previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName}))`;
      } else {
        previousFormula += `${previousColumn.operationType}(${getSafeFieldName(
          previousColumn?.sourceField
        )})`;
      }
    }
    return {
      label: 'Formula',
      dataType: 'number',
      operationType: 'formula',
      isBucketed: false,
      scale: 'ratio',
      params: previousFormula ? { ast: previousFormula } : {},
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern, operationDefinitionMap) => {
    // Basic idea: if it has any math operation in it, probably it cannot be transferable
    const ast = parse(column.params.ast);
    return !hasMathNode(ast, operationDefinitionMap);
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
            updateLayer(
              regenerateLayerFromAst(
                text,
                layer,
                columnId,
                currentColumn,
                indexPattern,
                operationDefinitionMap
              )
            );
          }}
        >
          Submit
        </EuiButton>
      </>
    );
  },
};

export function regenerateLayerFromAst(
  text: unknown,
  layer: IndexPatternLayer,
  columnId: string,
  currentColumn: FormulaIndexPatternColumn,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const ast = parse(text);
  /*
            { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
            */
  const extracted = extractColumns(
    columnId,
    removeUnderscore(operationDefinitionMap),
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

  return {
    ...layer,
    columns,
    columnOrder: getColumnOrder({
      ...layer,
      columns,
    }),
  };

  // TODO
  // turn ast into referenced columns
  // set state
}

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
    if (typeof node === 'number') {
      // leaf node
      return node;
    }
    if (typeof node === 'string') {
      if (indexPattern.getFieldByName(node)) {
        // leaf node
        return node;
      }
      // create a fake node just for making run a validation pass
      return parseNode({ name: 'avg', args: [node] });
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
      const [fieldName, ...params] = node.args;

      const field = indexPattern.getFieldByName(fieldName);

      const mappedParams = getOperationParams(nodeOperation, params || []);

      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'field'
      >).buildColumn(
        {
          layer,
          indexPattern,
          field: field ?? ({ displayName: fieldName, name: fieldName } as IndexPatternField),
        },
        mappedParams
      );
      const newColId = `${idPrefix}X${columns.length}`;
      newCol.customLabel = true;
      newCol.label = newColId;
      columns.push(newCol);
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'fullReference') {
      const [referencedOp, ...params] = node.args;

      const consumedParam = parseNode(referencedOp);
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

      const mappedParams = getOperationParams(nodeOperation, params || []);
      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'fullReference'
      >).buildColumn(
        {
          layer,
          indexPattern,
          referenceIds: [`${idPrefix}X${columns.length - 1}`],
        },
        mappedParams
      );
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

function hasMathNode(root: any, operations: Record<string, GenericOperationDefinition>): boolean {
  function findMathNodes(node: any): boolean[] {
    if (typeof node === 'string') {
      return [false];
    }
    if (typeof node === 'number') {
      return [false];
    }
    if (node.name in operations) {
      return [false];
    }
    return node.args.flatMap(findMathNodes);
  }
  return Boolean(findMathNodes(root).filter(Boolean).length);
}

function getSafeFieldName(fieldName: string | undefined) {
  // clean up the "Records" field for now
  if (!fieldName || fieldName === 'Records') {
    return '';
  }
  return fieldName;
}

function getOperationParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: unknown[]
) {
  // TODO: to be converted with named params
  const formalArgs = operation.operationParams || [];
  // At the moment is positional as expressed in operationParams
  return params.reduce((args, param, i) => {
    if (formalArgs[i]) {
      const paramName = formalArgs[i].name;
      args[paramName] = param;
    }
    return args;
  }, {});
}

function removeUnderscore(
  operationDefinitionMap: Record<string, GenericOperationDefinition>
): Record<string, GenericOperationDefinition> {
  return Object.keys(operationDefinitionMap).reduce((memo, operationTypeSnakeCase) => {
    const operationType = operationTypeSnakeCase.replace(/([_][a-z])/, (group) =>
      group.replace('_', '')
    );
    memo[operationType] = operationDefinitionMap[operationTypeSnakeCase];
    return memo;
  }, {} as Record<string, GenericOperationDefinition>);
}
