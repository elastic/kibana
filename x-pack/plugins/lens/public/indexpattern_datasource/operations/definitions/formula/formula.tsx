/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { isObject } from 'lodash';
import type { TinymathAST, TinymathVariable } from '@kbn/tinymath';
import { EuiButton, EuiTextArea } from '@elastic/eui';
import { OperationDefinition, GenericOperationDefinition, IndexPatternColumn } from '../index';
import { ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern, IndexPatternLayer } from '../../../types';
import { getColumnOrder } from '../../layer_helpers';
import { mathOperation } from './math';
import { documentField } from '../../../document_field';
import { runASTValidation, shouldHaveFieldArgument, tryToParse } from './validation';
import {
  findVariables,
  getOperationParams,
  getSafeFieldName,
  groupArgsByType,
  hasMathNode,
} from './util';

export interface FormulaIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'formula';
  params: {
    formula?: string;
    isFormulaBroken?: boolean;
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
    if (!column.params.formula || !operationDefinitionMap) {
      return;
    }
    const { root, error } = tryToParse(column.params.formula);
    if (root == null) {
      return [error as string];
    }

    const errors = runASTValidation(root, layer, indexPattern, operationDefinitionMap);
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
    const currentColumn = layer.columns[columnId] as FormulaIndexPatternColumn;
    const params = currentColumn.params;
    const label = !params?.isFormulaBroken ? params?.formula : '';
    return [
      {
        type: 'function',
        function: 'mapColumn',
        arguments: {
          id: [columnId],
          name: [label || ''],
          exp: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'math',
                  arguments: {
                    expression: [`${currentColumn.references[0]}`],
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
        if (metric && 'sourceField' in metric) {
          const fieldName = getSafeFieldName(metric.sourceField);
          // TODO need to check the input type from the definition
          previousFormula += `${previousColumn.operationType}(${metric.operationType}(${fieldName}))`;
        }
      } else {
        if (previousColumn && 'sourceField' in previousColumn) {
          previousFormula += `${previousColumn.operationType}(${getSafeFieldName(
            previousColumn?.sourceField
          )})`;
        }
      }
    }
    return {
      label: 'Formula',
      dataType: 'number',
      operationType: 'formula',
      isBucketed: false,
      scale: 'ratio',
      params: previousFormula ? { formula: previousFormula, isFormulaBroken: false } : {},
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern, operationDefinitionMap) => {
    // Basic idea: if it has any math operation in it, probably it cannot be transferable
    const { root } = tryToParse(column.params.formula || '');
    return Boolean(root != null && !hasMathNode(root));
  },

  paramEditor: function ParamEditor({
    layer,
    updateLayer,
    columnId,
    currentColumn,
    indexPattern,
    operationDefinitionMap,
  }) {
    const [text, setText] = useState(currentColumn.params.formula);
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
                text || '',
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

function parseAndExtract(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { root, error } = tryToParse(text);
  if (error || !root) {
    return { extracted: [], isValid: false };
  }
  // before extracting the data run the validation task and throw if invalid
  const errors = runASTValidation(root, layer, indexPattern, operationDefinitionMap);
  if (errors.length) {
    return { extracted: [], isValid: false };
  }
  /*
    { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
    */
  const extracted = extractColumns(columnId, operationDefinitionMap, root, layer, indexPattern);
  return { extracted, isValid: true };
}

export function regenerateLayerFromAst(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  currentColumn: FormulaIndexPatternColumn,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { extracted, isValid } = parseAndExtract(
    text,
    layer,
    columnId,
    indexPattern,
    operationDefinitionMap
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
      formula: text,
      isFormulaBroken: !isValid,
    },
    references: !isValid ? [] : [`${columnId}X${extracted.length - 1}`],
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
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern
) {
  const columns: IndexPatternColumn[] = [];

  function parseNode(node: TinymathAST) {
    if (typeof node === 'number' || node.type !== 'function') {
      // leaf node
      return node;
    }

    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      // it's a regular math node
      const consumedArgs = node.args.map(parseNode).filter(Boolean) as Array<
        number | TinymathVariable
      >;
      return {
        ...node,
        args: consumedArgs,
      };
    }

    // split the args into types for better TS experience
    const { namedArguments, variables, functions } = groupArgsByType(node.args);

    // operation node
    if (nodeOperation.input === 'field') {
      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      // a validation task passed before executing this and checked already there's a field
      const field = shouldHaveFieldArgument(node)
        ? indexPattern.getFieldByName(fieldName.value)!
        : documentField;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);

      const newCol = (nodeOperation as OperationDefinition<
        IndexPatternColumn,
        'field'
      >).buildColumn(
        {
          layer,
          indexPattern,
          field,
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
      const [referencedOp] = functions;
      const consumedParam = parseNode(referencedOp);

      const subNodeVariables = findVariables(consumedParam);
      const mathColumn = mathOperation.buildColumn({
        layer,
        indexPattern,
      });
      mathColumn.references = subNodeVariables;
      mathColumn.params.tinymathAst = consumedParam;
      columns.push(mathColumn);
      mathColumn.customLabel = true;
      mathColumn.label = `${idPrefix}X${columns.length - 1}`;

      const mappedParams = getOperationParams(nodeOperation, namedArguments || []);
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
      return newColId;
    }
    return node;
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
