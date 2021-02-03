/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { groupBy, isObject } from 'lodash';
import { parse, TinymathFunction, TinymathVariable } from '@kbn/tinymath';
import type { TinymathNamedArgument, TinymathAST } from '@kbn/tinymath';
import { EuiButton, EuiTextArea } from '@elastic/eui';
import { OperationDefinition, GenericOperationDefinition, IndexPatternColumn } from './index';
import { ReferenceBasedIndexPatternColumn } from './column_types';
import { IndexPattern, IndexPatternLayer } from '../../types';
import { getColumnOrder } from '../layer_helpers';
import { mathOperation, hasMathNode, findVariables } from './math';

type GroupedNodes = {
  [Key in TinymathNamedArgument['type']]: TinymathNamedArgument[];
} &
  {
    [Key in TinymathVariable['type']]: Array<TinymathVariable | string | number>;
  } &
  {
    [Key in TinymathFunction['type']]: TinymathFunction[];
  };

type TinymathNodeTypes = Exclude<TinymathAST, number>;

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
    let ast;
    try {
      ast = parse(column.params.formula);
    } catch (e) {
      return [
        i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
          defaultMessage: 'The Formula {expression} cannot be parsed',
          values: {
            expression: column.params.formula,
          },
        }),
      ];
    }
    const errors = addASTValidation(ast, indexPattern, operationDefinitionMap);
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
          id: [columnId],
          name: [layer.columns[columnId].label],
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
    const ast = parse(column.params.formula || '');
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
  try {
    const ast = parse(text);
    /*
    { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
    */
    const extracted = extractColumns(columnId, operationDefinitionMap, ast, layer, indexPattern);
    return { extracted, hasError: false };
  } catch (e) {
    return { extracted: [], hasError: true };
  }
}

export function regenerateLayerFromAst(
  text: string,
  layer: IndexPatternLayer,
  columnId: string,
  currentColumn: FormulaIndexPatternColumn,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { extracted, hasError } = parseAndExtract(
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
      isFormulaBroken: hasError,
    },
    references: hasError ? [] : [`${columnId}X${extracted.length - 1}`],
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

function addASTValidation(
  ast: TinymathAST,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>
) {
  function validateNode(node: TinymathAST): string[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      return [];
    }

    const errors: string[] = [];
    const { namedArguments, variables, functions } = groupArgsByType(node.args);

    if (nodeOperation.input === 'field') {
      if (!isFirstArgumentValidType(node.args, 'variable')) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
            defaultMessage:
              'The first argument for {operation} should be a {type} name. Found {argument}',
            values: {
              operation: node.name,
              type: 'field',
              argument: getValueOrName(node.args[0]),
            },
          })
        );
      } else {
        const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
        if (!indexPattern.getFieldByName(fieldName.value)) {
          errors.push(
            i18n.translate('xpack.lens.indexPattern.formulaFieldNotFound', {
              defaultMessage: 'The field {field} was not found.',
              values: {
                field: fieldName.value,
              },
            })
          );
        }
      }
      const missingParameters = validateParams(nodeOperation, namedArguments).filter(
        ({ isMissing }) => isMissing
      );
      if (missingParameters.length) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
            defaultMessage:
              'The operation {operation} in the Formula is missing the following parameters: {params}',
            values: {
              operation: node.name,
              params: missingParameters.join(', '),
            },
          })
        );
      }
      return errors;
    }
    if (nodeOperation.input === 'fullReference') {
      if (!isFirstArgumentValidType(node.args, 'function')) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
            defaultMessage:
              'The first argument for {operation} should be a {type} name. Found {argument}',
            values: {
              operation: node.name,
              type: 'field',
              argument: getValueOrName(node.args[0]),
            },
          })
        );
      }
      const missingParameters = validateParams(nodeOperation, namedArguments).filter(
        ({ isMissing }) => isMissing
      );
      if (missingParameters.length) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
            defaultMessage:
              'The operation {operation} in the Formula is missing the following parameters: {params}',
            values: {
              operation: node.name,
              params: missingParameters.join(', '),
            },
          })
        );
      }
      // maybe validate params here?
      return errors.concat(validateNode(functions[0]));
    }
    return [];
  }
  return validateNode(ast);
}

function getValueOrName(node: TinymathAST) {
  if (!isObject(node)) {
    return node;
  }
  if (node.type !== 'function') {
    return node.value;
  }
  return node.name;
}

function groupArgsByType(args: TinymathAST[]) {
  const { namedArgument, variable, function: functions } = groupBy<TinymathAST>(
    args,
    (arg: TinymathAST) => {
      return isObject(arg) ? arg.type : 'variable';
    }
  ) as GroupedNodes;
  // better naming
  return { namedArguments: namedArgument, variables: variable, functions };
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
      if (!isFirstArgumentValidType(node.args, 'variable')) {
        throw Error('field as first argument not found');
      }

      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      const field = indexPattern.getFieldByName(fieldName.value);

      if (!field) {
        throw Error('field not found');
      }

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
      if (!isFirstArgumentValidType(node.args, 'function')) {
        throw Error('first argument not valid for full reference');
      }
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

    throw Error('unexpected node');
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

function getSafeFieldName(fieldName: string | undefined) {
  // clean up the "Records" field for now
  if (!fieldName || fieldName === 'Records') {
    return '';
  }
  return fieldName;
}

function validateParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  const paramsObj = getOperationParams(operation, params);
  const formalArgs = operation.operationParams || [];
  return formalArgs
    .filter(({ required }) => required)
    .map(({ name }) => ({ name, isMissing: !(name in paramsObj) }));
}

function getOperationParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
): Record<string, string | number> {
  const formalArgs: Record<string, string> = (operation.operationParams || []).reduce(
    (memo: Record<string, string>, { name, type }) => {
      memo[name] = type;
      return memo;
    },
    {}
  );
  // At the moment is positional as expressed in operationParams
  return params.reduce<Record<string, string | number>>((args, { name, value }) => {
    if (formalArgs[name]) {
      args[name] = value;
    }
    return args;
  }, {});
}

function isFirstArgumentValidType(args: TinymathAST[], type: TinymathNodeTypes['type']) {
  return args?.length >= 1 && isObject(args[0]) && args[0].type === type;
}
