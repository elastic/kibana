/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { parse, TinymathLocation } from '@kbn/tinymath';
import type { TinymathAST, TinymathFunction, TinymathNamedArgument } from '@kbn/tinymath';
import {
  findMathNodes,
  findVariables,
  getOperationParams,
  getValueOrName,
  groupArgsByType,
  hasInvalidOperations,
  isMathNode,
} from './util';

import type { OperationDefinition, IndexPatternColumn, GenericOperationDefinition } from '../index';
import type { IndexPattern, IndexPatternLayer } from '../../../types';
import type { TinymathNodeTypes } from './types';

const validationErrors = {
  missingField: 'missing field',
  missingOperation: 'missing operation',
  missingParameter: 'missing parameter',
  wrongTypeParameter: 'wrong type parameter',
  wrongFirstArgument: 'wrong first argument',
  cannotAcceptParameter: 'cannot accept parameter',
  shouldNotHaveField: 'operation should not have field',
  unexpectedNode: 'unexpected node',
  fieldWithNoOperation: 'unexpected field with no operation',
  failedParsing: 'Failed to parse expression.', // note: this string comes from Tinymath, do not change it
};
export const errorsLookup = new Set(Object.values(validationErrors));

type ErrorTypes = keyof typeof validationErrors;

export interface ErrorWrapper {
  message: string;
  locations: TinymathLocation[];
}

export function isParsingError(message: string) {
  return message.includes(validationErrors.failedParsing);
}

function getMessageFromId({
  messageId,
  values,
  locations,
}: {
  messageId: ErrorTypes;
  values: Record<string, string | number>;
  locations: TinymathLocation[];
}): ErrorWrapper {
  let message: string;
  switch (messageId) {
    case 'wrongFirstArgument':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
        defaultMessage:
          'The first argument for {operation} should be a {type} name. Found {argument}',
        values,
      });
      break;
    case 'shouldNotHaveField':
      message = i18n.translate('xpack.lens.indexPattern.formulaFieldNotRequired', {
        defaultMessage: 'The operation {operation} does not accept any field as argument',
        values,
      });
      break;
    case 'cannotAcceptParameter':
      message = i18n.translate('xpack.lens.indexPattern.formulaParameterNotRequired', {
        defaultMessage: 'The operation {operation} does not accept any parameter',
        values,
      });
      break;
    case 'missingParameter':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
        defaultMessage:
          'The operation {operation} in the Formula is missing the following parameters: {params}',
        values,
      });
      break;
    case 'wrongTypeParameter':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
        defaultMessage:
          'The parameters for the operation {operation} in the Formula are of the wrong type: {params}',
        values,
      });
      break;
    case 'missingField':
      message = i18n.translate('xpack.lens.indexPattern.fieldNotFound', {
        defaultMessage:
          '{variablesLength, plural, one {Field} other {Fields}} {variablesList} not found',
        values,
      });
      break;
    case 'missingOperation':
      message = i18n.translate('xpack.lens.indexPattern.operationsNotFound', {
        defaultMessage:
          '{operationLength, plural, one {Operation} other {Operations}} {operationsList} not found',
        values,
      });
      break;
    case 'fieldWithNoOperation':
      message = i18n.translate('xpack.lens.indexPattern.fieldNoOperation', {
        defaultMessage: 'The field {field} cannot be used without operation',
        values,
      });
      break;
    case 'failedParsing':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
        defaultMessage: 'The Formula {expression} cannot be parsed',
        values,
      });
      break;
    default:
      message = 'no Error found';
      break;
  }

  return { message, locations };
}

export function tryToParse(formula: string, { shouldThrow }: { shouldThrow?: boolean } = {}) {
  let root;
  try {
    root = parse(formula);
  } catch (e) {
    return {
      root: undefined,
      error: getMessageFromId({
        messageId: 'failedParsing',
        values: {
          expression: formula,
        },
        locations: [],
      }),
    };
  }
  return { root, error: null };
}

export function runASTValidation(
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>
) {
  return [
    ...checkMissingVariableOrFunctions(ast, layer, indexPattern, operations),
    ...runFullASTValidation(ast, layer, indexPattern, operations),
  ];
}

function checkVariableEdgeCases(ast: TinymathAST, missingVariables: Set<string>) {
  const invalidVariableErrors = [];
  if (isObject(ast) && ast.type === 'variable' && !missingVariables.has(ast.value)) {
    invalidVariableErrors.push(
      getMessageFromId({
        messageId: 'fieldWithNoOperation',
        values: {
          field: ast.value,
        },
        locations: [ast.location],
      })
    );
  }
  return invalidVariableErrors;
}

function checkMissingVariableOrFunctions(
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>
): ErrorWrapper[] {
  const missingErrors: ErrorWrapper[] = [];
  const missingOperations = hasInvalidOperations(ast, operations);

  if (missingOperations.names.length) {
    missingErrors.push(
      getMessageFromId({
        messageId: 'missingOperation',
        values: {
          operationLength: missingOperations.names.length,
          operationsList: missingOperations.names.join(', '),
        },
        locations: missingOperations.locations,
      })
    );
  }
  const missingVariables = findVariables(ast).filter(
    // filter empty string as well?
    ({ value }) => !indexPattern.getFieldByName(value) && !layer.columns[value]
  );

  // need to check the arguments here: check only strings for now
  if (missingVariables.length) {
    missingErrors.push(
      getMessageFromId({
        messageId: 'missingField',
        values: {
          variablesLength: missingVariables.length,
          variablesList: missingVariables.map(({ value }) => value).join(', '),
        },
        locations: missingVariables.map(({ location }) => location),
      })
    );
  }
  const invalidVariableErrors = checkVariableEdgeCases(
    ast,
    new Set(missingVariables.map(({ value }) => value))
  );
  return [...missingErrors, ...invalidVariableErrors];
}

function runFullASTValidation(
  ast: TinymathAST,
  layer: IndexPatternLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>
): ErrorWrapper[] {
  const missingVariables = findVariables(ast).filter(
    // filter empty string as well?
    ({ value }) => !indexPattern.getFieldByName(value) && !layer.columns[value]
  );
  const missingVariablesSet = new Set(missingVariables.map(({ value }) => value));

  function validateNode(node: TinymathAST): ErrorWrapper[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      return validateMathNodes(node, missingVariablesSet);
    }

    const errors: ErrorWrapper[] = [];
    const { namedArguments, functions } = groupArgsByType(node.args);
    const [firstArg] = node?.args || [];

    if (nodeOperation.input === 'field') {
      if (shouldHaveFieldArgument(node)) {
        if (!isFirstArgumentValidType(firstArg, 'variable')) {
          errors.push(
            getMessageFromId({
              messageId: 'wrongFirstArgument',
              values: {
                operation: node.name,
                type: 'field',
                argument: getValueOrName(firstArg),
              },
              locations: [node.location],
            })
          );
        }
      } else {
        if (firstArg) {
          errors.push(
            getMessageFromId({
              messageId: 'shouldNotHaveField',
              values: {
                operation: node.name,
              },
              locations: [node.location],
            })
          );
        }
      }
      if (!canHaveParams(nodeOperation) && namedArguments.length) {
        errors.push(
          getMessageFromId({
            messageId: 'cannotAcceptParameter',
            values: {
              operation: node.name,
            },
            locations: [node.location],
          })
        );
      } else {
        const missingParams = getMissingParams(nodeOperation, namedArguments);
        if (missingParams.length) {
          errors.push(
            getMessageFromId({
              messageId: 'missingParameter',
              values: {
                operation: node.name,
                params: missingParams.map(({ name }) => name).join(', '),
              },
              locations: [node.location],
            })
          );
        }
        const wrongTypeParams = getWrongTypeParams(nodeOperation, namedArguments);
        if (wrongTypeParams.length) {
          errors.push(
            getMessageFromId({
              messageId: 'wrongTypeParameter',
              values: {
                operation: node.name,
                params: wrongTypeParams.map(({ name }) => name).join(', '),
              },
              locations: [node.location],
            })
          );
        }
      }
      return errors;
    }
    if (nodeOperation.input === 'fullReference') {
      if (!isFirstArgumentValidType(firstArg, 'function') || isMathNode(firstArg)) {
        errors.push(
          getMessageFromId({
            messageId: 'wrongFirstArgument',
            values: {
              operation: node.name,
              type: 'operation',
              argument: getValueOrName(firstArg),
            },
            locations: [node.location],
          })
        );
      }
      if (!canHaveParams(nodeOperation) && namedArguments.length) {
        errors.push(
          getMessageFromId({
            messageId: 'cannotAcceptParameter',
            values: {
              operation: node.name,
            },
            locations: [node.location],
          })
        );
      } else {
        const missingParameters = getMissingParams(nodeOperation, namedArguments);
        if (missingParameters.length) {
          errors.push(
            getMessageFromId({
              messageId: 'missingParameter',
              values: {
                operation: node.name,
                params: missingParameters.map(({ name }) => name).join(', '),
              },
              locations: [node.location],
            })
          );
        }
        const wrongTypeParams = getWrongTypeParams(nodeOperation, namedArguments);
        if (wrongTypeParams.length) {
          errors.push(
            getMessageFromId({
              messageId: 'wrongTypeParameter',
              values: {
                operation: node.name,
                params: wrongTypeParams.map(({ name }) => name).join(', '),
              },
              locations: [node.location],
            })
          );
        }
      }

      return errors.concat(validateNode(functions[0]));
    }
    return [];
  }

  return validateNode(ast);
}

export function canHaveParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>
) {
  return Boolean((operation.operationParams || []).length);
}

export function getInvalidParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isMissing, isCorrectType, isRequired }) => (isMissing && isRequired) || !isCorrectType
  );
}

export function getMissingParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isMissing, isRequired }) => isMissing && isRequired
  );
}

export function getWrongTypeParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isCorrectType, isMissing }) => !isCorrectType && !isMissing
  );
}

export function validateParams(
  operation:
    | OperationDefinition<IndexPatternColumn, 'field'>
    | OperationDefinition<IndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  const paramsObj = getOperationParams(operation, params);
  const formalArgs = operation.operationParams || [];
  return formalArgs.map(({ name, type, required }) => ({
    name,
    isMissing: !(name in paramsObj),
    isCorrectType: typeof paramsObj[name] === type,
    isRequired: required,
  }));
}

export function shouldHaveFieldArgument(node: TinymathFunction) {
  return !['count'].includes(node.name);
}

export function isFirstArgumentValidType(arg: TinymathAST, type: TinymathNodeTypes['type']) {
  return isObject(arg) && arg.type === type;
}

export function validateMathNodes(root: TinymathAST, missingVariableSet: Set<string>) {
  const mathNodes = findMathNodes(root);
  const errors = [];
  const invalidNodes = mathNodes.filter((node: TinymathFunction) => {
    // check the following patterns:
    const { variables } = groupArgsByType(node.args);
    const fieldVariables = variables.filter((v) => isObject(v) && !missingVariableSet.has(v.value));
    // field + field (or string)
    const atLeastTwoFields = fieldVariables.length > 1;
    // field + number
    // when computing the difference, exclude invalid fields
    const validVariables = variables.filter(
      (v) => !isObject(v) || !missingVariableSet.has(v.value)
    );
    // Make sure to have at least one valid field to compare, or skip the check
    const mathBetweenFieldAndNumbers =
      fieldVariables.length > 0 && validVariables.length - fieldVariables.length > 0;
    return atLeastTwoFields || mathBetweenFieldAndNumbers;
  });
  if (invalidNodes.length) {
    errors.push({
      message: i18n.translate('xpack.lens.indexPattern.mathNotAllowedBetweenFields', {
        defaultMessage: 'Math operations are allowed between operations, not fields',
      }),
      locations: invalidNodes.map(({ location }) => location),
    });
  }
  return errors;
}
