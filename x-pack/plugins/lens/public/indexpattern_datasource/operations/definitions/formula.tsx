/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import {
  mathOperation,
  hasMathNode,
  findVariables,
  isMathNode,
  hasInvalidOperations,
} from './math';
import { documentField } from '../../document_field';

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
    const missingErrors: string[] = [];
    const missingOperations = hasInvalidOperations(ast, operationDefinitionMap);

    if (missingOperations.length) {
      missingErrors.push(
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
    const missingVariables = findVariables(ast).filter(
      // filter empty string as well?
      (variable) => !indexPattern.getFieldByName(variable) && !layer.columns[variable]
    );

    // need to check the arguments here: check only strings for now
    if (missingVariables.length) {
      missingErrors.push(
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
    const invalidVariableErrors = [];
    // TODO: add check for Math operation of fields as well
    if (isObject(ast) && ast.type === 'variable' && !missingVariables.includes(ast.value)) {
      invalidVariableErrors.push(
        i18n.translate('xpack.lens.indexPattern.fieldNoOperation', {
          defaultMessage: 'The field {field} cannot be used without operation',
          values: {
            field: ast.value,
          },
        })
      );
    }

    const invalidFunctionErrors = addASTValidation(ast, indexPattern, operationDefinitionMap);
    const errors = [...missingErrors, ...invalidVariableErrors, ...invalidFunctionErrors];
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
    return !hasMathNode(ast);
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
    return { extracted, isValid: true };
  } catch (e) {
    return { extracted: [], isValid: false };
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
    const { namedArguments, functions } = groupArgsByType(node.args);
    const [firstArg] = node?.args || [];

    if (nodeOperation.input === 'field') {
      if (shouldHaveFieldArgument(node)) {
        if (!isFirstArgumentValidType(firstArg, 'variable')) {
          errors.push(
            i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
              defaultMessage:
                'The first argument for {operation} should be a {type} name. Found {argument}',
              values: {
                operation: node.name,
                type: 'field',
                argument: getValueOrName(firstArg),
              },
            })
          );
        }
      } else {
        if (firstArg) {
          errors.push(
            i18n.translate('xpack.lens.indexPattern.formulaFieldNotRequired', {
              defaultMessage: 'The operation {operation} does not accept any field as argument',
              values: {
                operation: node.name,
              },
            })
          );
        }
      }
      if (!canHaveParams(nodeOperation) && namedArguments.length) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaParameterNotRequired', {
            defaultMessage: 'The operation {operation} does not accept any parameter',
            values: {
              operation: node.name,
            },
          })
        );
      } else {
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
                params: missingParameters.map(({ name }) => name).join(', '),
              },
            })
          );
        }
      }
      return errors;
    }
    if (nodeOperation.input === 'fullReference') {
      if (!isFirstArgumentValidType(firstArg, 'function') || isMathNode(firstArg)) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
            defaultMessage:
              'The first argument for {operation} should be a {type} name. Found {argument}',
            values: {
              operation: node.name,
              type: 'function',
              argument: getValueOrName(node.args[0]),
            },
          })
        );
      }
      if (!canHaveParams(nodeOperation) && namedArguments.length) {
        errors.push(
          i18n.translate('xpack.lens.indexPattern.formulaParameterNotRequired', {
            defaultMessage: 'The operation {operation} does not accept any parameter',
            values: {
              operation: node.name,
            },
          })
        );
      } else {
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
                params: missingParameters.map(({ name }) => name).join(', '),
              },
            })
          );
        }
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
  return {
    namedArguments: namedArgument || [],
    variables: variable || [],
    functions: functions || [],
  };
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
      if (!isMathNode(node)) {
        throw Error('missing operation');
      }
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
    // the first argument is a special one
    const [firstArg] = node?.args || [];

    // operation node
    if (nodeOperation.input === 'field') {
      if (shouldHaveFieldArgument(node)) {
        if (!isFirstArgumentValidType(firstArg, 'variable')) {
          throw Error('field as first argument not found');
        }
      } else {
        if (firstArg) {
          throw Error('field as first argument not valid');
        }
      }

      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      const field = shouldHaveFieldArgument(node)
        ? indexPattern.getFieldByName(fieldName.value)
        : documentField;

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
      if (!isFirstArgumentValidType(firstArg, 'function') || isMathNode(firstArg)) {
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
  // a special check on the root node
  if (isObject(ast) && ast.type === 'variable') {
    throw Error('field cannot be used without operation');
  }
  const root = parseNode(ast);
  const variables = findVariables(root);
  const hasMissingVariables = variables.some(
    (variable) => !indexPattern.getFieldByName(variable) || !layer.columns[variable]
  );
  if (hasMissingVariables) {
    throw Error('missing variable');
  }
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

function canHaveParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>
) {
  return Boolean((operation.operationParams || []).length);
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

function shouldHaveFieldArgument(node: TinymathFunction) {
  return !['count'].includes(node.name);
}

function isFirstArgumentValidType(arg: TinymathAST, type: TinymathNodeTypes['type']) {
  return isObject(arg) && arg.type === type;
}
