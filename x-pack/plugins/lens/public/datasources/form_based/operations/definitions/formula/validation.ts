/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import { parse, TinymathLocation, TinymathVariable } from '@kbn/tinymath';
import type { TinymathAST, TinymathFunction, TinymathNamedArgument } from '@kbn/tinymath';
import { luceneStringToDsl, toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import {
  isAbsoluteTimeShift,
  parseTimeShift,
  REASON_IDS,
  REASON_ID_TYPES,
  validateAbsoluteTimeShift,
} from '@kbn/data-plugin/common';
import { DateRange } from '../../../../../../common/types';
import {
  findMathNodes,
  findVariables,
  getOperationParams,
  getValueOrName,
  groupArgsByType,
  isMathNode,
  tinymathFunctions,
} from './util';

import type {
  OperationDefinition,
  GenericIndexPatternColumn,
  GenericOperationDefinition,
} from '..';
import type { FormBasedLayer } from '../../../types';
import type { IndexPattern } from '../../../../../types';
import type { TinymathNodeTypes } from './types';
import { nonNullable } from '../../../utils';

interface ValidationErrors {
  missingField: { message: string; type: { variablesLength: number; variablesList: string } };
  missingOperation: {
    message: string;
    type: { operationLength: number; operationsList: string };
  };
  missingParameter: {
    message: string;
    type: { operation: string; params: string };
  };
  wrongTypeParameter: {
    message: string;
    type: { operation: string; params: string };
  };
  wrongTypeArgument: {
    message: string;
    type: { operation: string; name: string; type: string; expectedType: string };
  };
  wrongFirstArgument: {
    message: string;
    type: { operation: string; type: string; argument: string | number };
  };
  cannotAcceptParameter: { message: string; type: { operation: string } };
  shouldNotHaveField: { message: string; type: { operation: string } };
  tooManyArguments: { message: string; type: { operation: string } };
  fieldWithNoOperation: {
    message: string;
    type: { field: string };
  };
  failedParsing: { message: string; type: { expression: string } };
  duplicateArgument: {
    message: string;
    type: { operation: string; params: string };
  };
  missingMathArgument: {
    message: string;
    type: { operation: string; count: number; params: string };
  };
  tooManyQueries: {
    message: string;
    type: {};
  };
  tooManyFirstArguments: {
    message: string;
    type: {
      operation: string;
      type: string;
      text: string;
      supported?: number;
    };
  };
  wrongArgument: {
    message: string;
    type: { operation: string; text: string; type: string };
  };
  wrongReturnedType: {
    message: string;
    type: { text: string };
  };
  filtersTypeConflict: {
    message: string;
    type: { operation: string; outerType: string; innerType: string };
  };
  useAlternativeFunction: {
    message: string;
    type: {
      operation: string;
      params: string;
      alternativeFn: string;
    };
  };
}

type ErrorTypes = keyof ValidationErrors;
type ErrorValues<K extends ErrorTypes> = ValidationErrors[K]['type'];

export interface ErrorWrapper {
  message: string;
  locations: TinymathLocation[];
  severity?: 'error' | 'warning';
}

function getNodeLocation(node: TinymathFunction): TinymathLocation[] {
  return [node.location].filter(nonNullable);
}

function getArgumentType(arg: TinymathAST, operations: Record<string, GenericOperationDefinition>) {
  if (!isObject(arg)) {
    return typeof arg;
  }
  if (arg.type === 'function') {
    if (tinymathFunctions[arg.name]) {
      return tinymathFunctions[arg.name].outputType ?? 'number';
    }
    // Assume it's a number for now
    if (operations[arg.name]) {
      return 'number';
    }
  }
  // leave for now other argument types
}

export function isParsingError(message: string) {
  return message.includes('Failed to parse expression');
}

function findFunctionNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenFunctionNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    return [node, ...node.args.flatMap(flattenFunctionNodes)].filter(nonNullable);
  }

  return flattenFunctionNodes(root);
}

export function hasInvalidOperations(
  node: TinymathAST | string,
  operations: Record<string, GenericOperationDefinition>
): { names: string[]; locations: TinymathLocation[] } {
  const nodes = findFunctionNodes(node).filter((v) => !isMathNode(v) && !operations[v.name]);
  return {
    // avoid duplicates
    names: Array.from(new Set(nodes.map(({ name }) => name))),
    locations: nodes.map(({ location }) => location).filter(nonNullable),
  };
}

export const getRawQueryValidationError = (text: string, operations: Record<string, unknown>) => {
  // try to extract the query context here
  const singleLine = text.split('\n').join('');
  const languagesRegexp = /(kql|lucene)/;
  const allArgs = singleLine.split(',').filter((args) => languagesRegexp.test(args));
  // check for the presence of a valid ES operation
  const containsOneValidOperation = Object.keys(operations).some((operation) =>
    singleLine.includes(operation)
  );
  // no args or no valid operation, no more work to do here
  if (allArgs.length === 0 || !containsOneValidOperation) {
    return;
  }
  // at this point each entry in allArgs may contain one or more
  // in the worst case it would be a math chain of count operation
  // For instance: count(kql=...) + count(lucene=...) - count(kql=...)
  // therefore before partition them, split them by "count" keywork and filter only string with a length
  const flattenArgs = allArgs.flatMap((arg) =>
    arg.split('count').filter((subArg) => languagesRegexp.test(subArg))
  );
  const [kqlQueries, luceneQueries] = partition(flattenArgs, (arg) => /kql/.test(arg));
  const errors = [];
  for (const kqlQuery of kqlQueries) {
    const result = validateQueryQuotes(kqlQuery, 'kql');
    if (result) {
      errors.push(result);
    }
  }
  for (const luceneQuery of luceneQueries) {
    const result = validateQueryQuotes(luceneQuery, 'lucene');
    if (result) {
      errors.push(result);
    }
  }
  return errors.length ? errors : undefined;
};

const validateQueryQuotes = (rawQuery: string, language: 'kql' | 'lucene') => {
  // check if the raw argument has the minimal requirements
  // use the rest operator here to handle cases where comparison operations are used in the query
  const [, ...rawValue] = rawQuery.split('=');
  const fullRawValue = (rawValue || ['']).join('');
  const cleanedRawValue = fullRawValue.trim();
  // it must start with a single quote, and quotes must have a closure
  if (
    cleanedRawValue.length &&
    (cleanedRawValue[0] !== "'" || !/'\s*([^']+?)\s*'/.test(fullRawValue)) &&
    // there's a special case when it's valid as two single quote strings
    cleanedRawValue !== "''"
  ) {
    return i18n.translate('xpack.lens.indexPattern.formulaOperationQueryError', {
      defaultMessage: `Single quotes are required for {language}='' at {rawQuery}`,
      values: { language, rawQuery },
    });
  }
};

export const getQueryValidationError = (
  { value: query, name: language, text }: TinymathNamedArgument,
  indexPattern: IndexPattern
): string | undefined => {
  // check if the raw argument has the minimal requirements
  const result = validateQueryQuotes(text, language as 'kql' | 'lucene');
  // forward the error here is ok?
  if (result) {
    return result;
  }
  try {
    if (language === 'kql') {
      toElasticsearchQuery(fromKueryExpression(query), indexPattern);
    } else {
      luceneStringToDsl(query);
    }
    return;
  } catch (e) {
    return e.message;
  }
};

function getMessageFromId<K extends ErrorTypes>({
  messageId,
  values,
  locations,
}: {
  messageId: K;
  values: ErrorValues<K>;
  locations: TinymathLocation[];
}): ErrorWrapper {
  let message: string;
  // Use a less strict type instead of doing a typecast on each message type
  const out = values as unknown as Record<string, string>;
  switch (messageId) {
    case 'wrongFirstArgument':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
        defaultMessage:
          'The first argument for {operation} should be a {type} name. Found {argument}',
        values: { operation: out.operation, type: out.type, argument: out.argument },
      });
      break;
    case 'shouldNotHaveField':
      message = i18n.translate('xpack.lens.indexPattern.formulaFieldNotRequired', {
        defaultMessage: 'The operation {operation} does not accept any field as argument',
        values: { operation: out.operation },
      });
      break;
    case 'cannotAcceptParameter':
      message = i18n.translate('xpack.lens.indexPattern.formulaParameterNotRequired', {
        defaultMessage: 'The operation {operation} does not accept any parameter',
        values: { operation: out.operation },
      });
      break;
    case 'missingParameter':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
        defaultMessage:
          'The operation {operation} in the Formula is missing the following parameters: {params}',
        values: { operation: out.operation, params: out.params },
      });
      break;
    case 'wrongTypeParameter':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionWrongType', {
        defaultMessage:
          'The parameters for the operation {operation} in the Formula are of the wrong type: {params}',
        values: { operation: out.operation, params: out.params },
      });
      break;
    case 'wrongTypeArgument':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionWrongTypeArgument', {
        defaultMessage:
          'The {name} argument for the operation {operation} in the Formula is of the wrong type: {type} instead of {expectedType}',
        values: {
          operation: out.operation,
          name: out.name,
          type: out.type,
          expectedType: out.expectedType,
        },
      });
      break;
    case 'duplicateArgument':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationDuplicateParams', {
        defaultMessage:
          'The parameters for the operation {operation} have been declared multiple times: {params}',
        values: { operation: out.operation, params: out.params },
      });
      break;
    case 'missingField':
      message = i18n.translate('xpack.lens.indexPattern.formulaFieldNotFound', {
        defaultMessage:
          '{variablesLength, plural, one {Field} other {Fields}} {variablesList} not found',
        values: { variablesLength: out.variablesLength, variablesList: out.variablesList },
      });
      break;
    case 'missingOperation':
      message = i18n.translate('xpack.lens.indexPattern.operationsNotFound', {
        defaultMessage:
          '{operationLength, plural, one {Operation} other {Operations}} {operationsList} not found',
        values: { operationLength: out.operationLength, operationsList: out.operationsList },
      });
      break;
    case 'fieldWithNoOperation':
      message = i18n.translate('xpack.lens.indexPattern.fieldNoOperation', {
        defaultMessage: 'The field {field} cannot be used without operation',
        values: { field: out.field },
      });
      break;
    case 'failedParsing':
      message = i18n.translate('xpack.lens.indexPattern.formulaExpressionParseError', {
        defaultMessage: 'The Formula {expression} cannot be parsed',
        values: { expression: out.expression },
      });
      break;
    case 'tooManyArguments':
      message = i18n.translate('xpack.lens.indexPattern.formulaWithTooManyArguments', {
        defaultMessage: 'The operation {operation} has too many arguments',
        values: { operation: out.operation },
      });
      break;
    case 'missingMathArgument':
      message = i18n.translate('xpack.lens.indexPattern.formulaMathMissingArgument', {
        defaultMessage:
          'The operation {operation} in the Formula is missing {count} arguments: {params}',
        values: { operation: out.operation, count: out.count, params: out.params },
      });
      break;
    case 'tooManyQueries':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationDoubleQueryError', {
        defaultMessage: 'Use only one of kql= or lucene=, not both',
      });
      break;
    case 'tooManyFirstArguments':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationTooManyFirstArguments', {
        defaultMessage:
          'The operation {operation} in the Formula requires a {supported, plural, one {single} other {supported}} {type}, found: {text}',
        values: {
          operation: out.operation,
          text: out.text,
          type: out.type,
          supported: out.supported || 1,
        },
      });
      break;
    case 'wrongArgument':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationwrongArgument', {
        defaultMessage:
          'The operation {operation} in the Formula does not support {type} parameters, found: {text}',
        values: { operation: out.operation, text: out.text, type: out.type },
      });
      break;
    case 'wrongReturnedType':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationWrongReturnedType', {
        defaultMessage: 'The return value type of the operation {text} is not supported in Formula',
        values: { text: out.text },
      });
      break;
    case 'filtersTypeConflict':
      message = i18n.translate('xpack.lens.indexPattern.formulaOperationFiltersTypeConflicts', {
        defaultMessage:
          'The Formula filter of type "{outerType}" is not compatible with the inner filter of type "{innerType}" from the {operation} operation',
        values: { operation: out.operation, outerType: out.outerType, innerType: out.innerType },
      });
      break;
    case 'useAlternativeFunction':
      message = i18n.translate('xpack.lens.indexPattern.formulaUseAlternative', {
        defaultMessage: `The operation {operation} in the Formula is missing the {params} argument: use the {alternativeFn} operation instead`,
        values: { operation: out.operation, params: out.params, alternativeFn: out.alternativeFn },
      });
      break;
    // case 'mathRequiresFunction':
    //   message = i18n.translate('xpack.lens.indexPattern.formulaMathRequiresFunctionLabel', {
    //     defaultMessage; 'The function {name} requires an Elasticsearch function',
    //     values: { ...values },
    //   });
    //   break;
    default:
      message = 'no Error found';
      break;
  }

  return { message, locations };
}

export function tryToParse(
  formula: string,
  operations: Record<string, unknown>
): { root: TinymathAST; error: null } | { root: null; error: ErrorWrapper } {
  let root;
  try {
    root = parse(formula);
  } catch (e) {
    // A tradeoff is required here, unless we want to reimplement a full parser
    // Internally the function has the following logic:
    // * if the formula contains no existing ES operation, assume it's a plain parse failure
    // * if the formula contains at least one existing operation, check for query problems
    const maybeQueryProblems = getRawQueryValidationError(formula, operations);
    if (maybeQueryProblems) {
      // need to emulate an error shape here
      return { root: null, error: { message: maybeQueryProblems[0], locations: [] } };
    }
    return {
      root: null,
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
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>,
  currentColumn: GenericIndexPatternColumn,
  dateRange?: DateRange
) {
  return [
    ...checkMissingVariableOrFunctions(ast, layer, indexPattern, operations),
    ...checkTopNodeReturnType(ast),
    ...runFullASTValidation(ast, layer, indexPattern, operations, dateRange, currentColumn),
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
  layer: FormBasedLayer,
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

function getAbsoluteTimeShiftErrorMessage(reason: REASON_ID_TYPES) {
  switch (reason) {
    case REASON_IDS.missingTimerange:
      return i18n.translate('xpack.lens.indexPattern.absoluteMissingTimeRange', {
        defaultMessage: 'Invalid time shift. No time range found as reference',
      });
    case REASON_IDS.invalidDate:
      return i18n.translate('xpack.lens.indexPattern.absoluteInvalidDate', {
        defaultMessage: 'Invalid time shift. The date is not of the correct format',
      });
    case REASON_IDS.shiftAfterTimeRange:
      return i18n.translate('xpack.lens.indexPattern.absoluteAfterTimeRange', {
        defaultMessage: 'Invalid time shift. The provided date is after the current time range',
      });
    case REASON_IDS.notAbsoluteTimeShift:
      return i18n.translate('xpack.lens.indexPattern.notAbsoluteTimeShift', {
        defaultMessage: 'Invalid time shift.',
      });
  }
}

function getQueryValidationErrors(
  namedArguments: TinymathNamedArgument[] | undefined,
  indexPattern: IndexPattern,
  dateRange: DateRange | undefined
): ErrorWrapper[] {
  const errors: ErrorWrapper[] = [];
  (namedArguments ?? []).forEach((arg) => {
    if (arg.name === 'kql' || arg.name === 'lucene') {
      const message = getQueryValidationError(
        arg as TinymathNamedArgument & { name: 'kql' | 'lucene' },
        indexPattern
      );
      if (message) {
        errors.push({
          message,
          locations: [arg.location],
        });
      }
    }

    if (arg.name === 'shift') {
      const parsedShift = parseTimeShift(arg.value);
      if (parsedShift === 'invalid') {
        if (isAbsoluteTimeShift(arg.value)) {
          // try to parse as absolute time shift
          const error = validateAbsoluteTimeShift(
            arg.value,
            dateRange
              ? {
                  from: dateRange.fromDate,
                  to: dateRange.toDate,
                }
              : undefined
          );
          if (error) {
            errors.push({
              message: getAbsoluteTimeShiftErrorMessage(error),
              locations: [arg.location],
            });
          }
        } else {
          errors.push({
            message: i18n.translate('xpack.lens.indexPattern.invalidTimeShift', {
              defaultMessage:
                'Invalid time shift. Enter positive integer amount followed by one of the units s, m, h, d, w, M, y. For example 3h for 3 hours',
            }),
            locations: [arg.location],
          });
        }
      }
    }
    if (arg.name === 'reducedTimeRange') {
      const parsedReducedTimeRange = parseTimeShift(arg.value || '');
      if (parsedReducedTimeRange === 'invalid' || parsedReducedTimeRange === 'previous') {
        errors.push({
          message: i18n.translate('xpack.lens.indexPattern.invalidReducedTimeRange', {
            defaultMessage:
              'Invalid reduced time range. Enter positive integer amount followed by one of the units s, m, h, d, w, M, y. For example 3h for 3 hours',
          }),
          locations: [arg.location],
        });
      }
    }
  });
  return errors;
}

function checkSingleQuery(namedArguments: TinymathNamedArgument[] | undefined) {
  return namedArguments
    ? namedArguments.filter((arg) => arg.name === 'kql' || arg.name === 'lucene').length > 1
    : undefined;
}

function validateFiltersArguments(
  node: TinymathFunction,
  nodeOperation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  namedArguments: TinymathNamedArgument[] | undefined,
  globalFilters?: Query
) {
  const errors = [];
  const { conflicts, innerType, outerType } = hasFiltersConflicts(
    nodeOperation,
    namedArguments,
    globalFilters
  );
  if (conflicts) {
    if (innerType && outerType) {
      errors.push(
        getMessageFromId({
          messageId: 'filtersTypeConflict',
          values: {
            operation: node.name,
            innerType,
            outerType,
          },
          locations: getNodeLocation(node),
        })
      );
    }
  }
  return errors;
}

function validateNameArguments(
  node: TinymathFunction,
  nodeOperation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  namedArguments: TinymathNamedArgument[] | undefined,
  indexPattern: IndexPattern,
  dateRange: DateRange | undefined
) {
  const errors = [];
  const missingParams = getMissingParams(nodeOperation, namedArguments);
  if (missingParams.length) {
    errors.push(
      getMessageFromId({
        messageId: 'missingParameter',
        values: {
          operation: node.name,
          params: missingParams.map(({ name }) => name).join(', '),
        },
        locations: getNodeLocation(node),
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
        locations: getNodeLocation(node),
      })
    );
  }
  const duplicateParams = getDuplicateParams(namedArguments);
  if (duplicateParams.length) {
    errors.push(
      getMessageFromId({
        messageId: 'duplicateArgument',
        values: {
          operation: node.name,
          params: duplicateParams.join(', '),
        },
        locations: getNodeLocation(node),
      })
    );
  }
  const queryValidationErrors = getQueryValidationErrors(namedArguments, indexPattern, dateRange);
  if (queryValidationErrors.length) {
    errors.push(...queryValidationErrors);
  }
  const hasTooManyQueries = checkSingleQuery(namedArguments);
  if (hasTooManyQueries) {
    errors.push(
      getMessageFromId({
        messageId: 'tooManyQueries',
        values: {},
        locations: getNodeLocation(node),
      })
    );
  }
  return errors;
}

const DEFAULT_RETURN_TYPE = 'number';
function checkTopNodeReturnType(ast: TinymathAST): ErrorWrapper[] {
  if (
    isObject(ast) &&
    ast.type === 'function' &&
    ast.text &&
    (tinymathFunctions[ast.name]?.outputType || DEFAULT_RETURN_TYPE) !== DEFAULT_RETURN_TYPE
  ) {
    return [
      getMessageFromId({
        messageId: 'wrongReturnedType',
        values: {
          text: ast.text,
        },
        locations: getNodeLocation(ast),
      }),
    ];
  }
  return [];
}

function runFullASTValidation(
  ast: TinymathAST,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>,
  dateRange?: DateRange,
  currentColumn?: GenericIndexPatternColumn
): ErrorWrapper[] {
  const missingVariables = findVariables(ast).filter(
    // filter empty string as well?
    ({ value }) => !indexPattern.getFieldByName(value) && !layer.columns[value]
  );
  const missingVariablesSet = new Set(missingVariables.map(({ value }) => value));
  const globalFilter = currentColumn?.filter;

  function validateNode(node: TinymathAST): ErrorWrapper[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    const nodeOperation = operations[node.name];
    const errors: ErrorWrapper[] = [];
    const { namedArguments, functions, variables } = groupArgsByType(node.args);
    const [firstArg] = node?.args || [];

    if (!nodeOperation) {
      errors.push(...validateMathNodes(node, missingVariablesSet, operations));
      // carry on with the validation for all the functions within the math operation
      if (functions?.length) {
        return errors.concat(functions.flatMap((fn) => validateNode(fn)));
      }
    } else {
      if (nodeOperation.input === 'field') {
        if (!isArgumentValidType(firstArg, 'variable')) {
          if (isMathNode(firstArg)) {
            errors.push(
              getMessageFromId({
                messageId: 'wrongFirstArgument',
                values: {
                  operation: node.name,
                  type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
                    defaultMessage: 'field',
                  }),
                  argument: `math operation`,
                },
                locations: getNodeLocation(node),
              })
            );
          } else {
            if (shouldHaveFieldArgument(node)) {
              errors.push(
                getMessageFromId({
                  messageId: 'wrongFirstArgument',
                  values: {
                    operation: node.name,
                    type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
                      defaultMessage: 'field',
                    }),
                    argument:
                      getValueOrName(firstArg) ||
                      i18n.translate('xpack.lens.indexPattern.formulaNoFieldForOperation', {
                        defaultMessage: 'no field',
                      }),
                  },
                  locations: getNodeLocation(node),
                })
              );
            }
          }
        } else {
          // If the first argument is valid proceed with the other arguments validation
          const fieldErrors = validateFieldArguments(node, variables, {
            isFieldOperation: true,
            firstArg,
            returnedType: getReturnedType(nodeOperation, indexPattern, firstArg),
          });
          if (fieldErrors.length) {
            errors.push(...fieldErrors);
          }
        }
        const functionErrors = validateFunctionArguments(node, functions, 0, {
          isFieldOperation: true,
          type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
            defaultMessage: 'field',
          }),
          firstArgValidation: false,
        });
        if (functionErrors.length) {
          errors.push(...functionErrors);
        }
        if (!canHaveParams(nodeOperation) && namedArguments.length) {
          errors.push(
            getMessageFromId({
              messageId: 'cannotAcceptParameter',
              values: {
                operation: node.name,
              },
              locations: getNodeLocation(node),
            })
          );
        } else {
          const argumentsErrors = validateNameArguments(
            node,
            nodeOperation,
            namedArguments,
            indexPattern,
            dateRange
          );

          const filtersErrors = validateFiltersArguments(
            node,
            nodeOperation,
            namedArguments,
            globalFilter
          );
          errors.push(...argumentsErrors, ...filtersErrors);
        }
        return errors;
      }
      if (nodeOperation.input === 'fullReference') {
        // What about fn(7 + 1)? We may want to allow that
        // In general this should be handled down the Esaggs route rather than here
        const isFirstArgumentNotValid = Boolean(
          !isArgumentValidType(firstArg, 'function') ||
            (isMathNode(firstArg) &&
              validateMathNodes(firstArg, missingVariablesSet, operations).length)
        );
        // First field has a special handling
        if (isFirstArgumentNotValid) {
          errors.push(
            getMessageFromId({
              messageId: 'wrongFirstArgument',
              values: {
                operation: node.name,
                type: i18n.translate('xpack.lens.indexPattern.formulaOperationValue', {
                  defaultMessage: 'operation',
                }),
                argument:
                  getValueOrName(firstArg) ||
                  i18n.translate('xpack.lens.indexPattern.formulaNoOperation', {
                    defaultMessage: 'no operation',
                  }),
              },
              locations: getNodeLocation(node),
            })
          );
        }
        // Check for multiple function passed
        const requiredFunctions = nodeOperation.requiredReferences
          ? nodeOperation.requiredReferences.length
          : 1;
        const functionErrors = validateFunctionArguments(node, functions, requiredFunctions, {
          isFieldOperation: false,
          firstArgValidation: isFirstArgumentNotValid,
          type: i18n.translate('xpack.lens.indexPattern.formulaMetricValue', {
            defaultMessage: 'metric',
          }),
        });
        if (functionErrors.length) {
          errors.push(...functionErrors);
        }

        if (!canHaveParams(nodeOperation) && namedArguments.length) {
          errors.push(
            getMessageFromId({
              messageId: 'cannotAcceptParameter',
              values: {
                operation: node.name,
              },
              locations: getNodeLocation(node),
            })
          );
        } else {
          // check for fields passed at any position
          const fieldErrors = validateFieldArguments(node, variables, {
            isFieldOperation: false,
            firstArg,
            returnedType: undefined,
          });
          const argumentsErrors = validateNameArguments(
            node,
            nodeOperation,
            namedArguments,
            indexPattern,
            dateRange
          );
          const filtersErrors = validateFiltersArguments(
            node,
            nodeOperation,
            namedArguments,
            globalFilter
          );
          errors.push(...fieldErrors, ...argumentsErrors, ...filtersErrors);
        }
      }
      return errors.concat(validateNode(functions[0]));
    }
    return errors;
  }

  return validateNode(ast);
}

export function canHaveParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>
) {
  return Boolean((operation.operationParams || []).length) || operation.filterable;
}

export function getInvalidParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isMissing, isCorrectType, isRequired }) => (isMissing && isRequired) || !isCorrectType
  );
}

export function getMissingParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isMissing, isRequired }) => isMissing && isRequired
  );
}

export function getWrongTypeParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isCorrectType, isMissing }) => !isCorrectType && !isMissing
  );
}

function getReturnedType(
  operation: OperationDefinition<GenericIndexPatternColumn, 'field'>,
  indexPattern: IndexPattern,
  firstArg: TinymathAST
) {
  const variables = findVariables(firstArg);
  if (variables.length !== 1) {
    return;
  }
  const field = indexPattern.getFieldByName(getValueOrName(variables[0]) as string);
  // while usually this is used where it is safe, as generic function it should check anyway
  if (!field) {
    return;
  }
  // here we're validating the support of the returned type for Formula, not for the operation itself
  // that is already handled indipendently by the operation. So return the scale type
  return operation.getPossibleOperationForField(field)?.scale;
}

function getDuplicateParams(params: TinymathNamedArgument[] = []) {
  const uniqueArgs = Object.create(null);
  for (const { name } of params) {
    const counter = uniqueArgs[name] || 0;
    uniqueArgs[name] = counter + 1;
  }
  const uniqueNames = Object.keys(uniqueArgs);
  if (params.length > uniqueNames.length) {
    return uniqueNames.filter((name) => uniqueArgs[name] > 1);
  }
  return [];
}

export function hasFiltersConflicts(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = [],
  globalFilter?: Query
) {
  const paramsObj = getOperationParams(operation, params);
  if (!operation.filterable || !globalFilter || !(paramsObj.kql || paramsObj.lucene)) {
    return { conflicts: false };
  }
  const language = globalFilter.language === 'kuery' ? 'kql' : globalFilter.language;
  const conflicts = !(language in paramsObj);
  return {
    conflicts,
    innerType: paramsObj.lucene ? 'lucene' : 'kql',
    outerType: language,
  };
}

export function validateParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  const paramsObj = getOperationParams(operation, params);
  const formalArgs = [...(operation.operationParams ?? [])];
  if (operation.filterable) {
    formalArgs.push(
      { name: 'kql', type: 'string', required: false },
      { name: 'lucene', type: 'string', required: false }
    );
  }
  return formalArgs.map(({ name, type, required }) => ({
    name,
    isMissing: !(name in paramsObj),
    isCorrectType: typeof paramsObj[name] === type,
    isRequired: required,
  }));
}

export function shouldHaveFieldArgument(node: TinymathFunction) {
  return hasFunctionFieldArgument(node.name);
}

export function hasFunctionFieldArgument(type: string) {
  return !['count'].includes(type);
}

export function isArgumentValidType(arg: TinymathAST | string, type: TinymathNodeTypes['type']) {
  return isObject(arg) && arg.type === type;
}

export function validateMathNodes(
  root: TinymathAST,
  missingVariableSet: Set<string>,
  operations: Record<string, GenericOperationDefinition>
) {
  const mathNodes = findMathNodes(root);
  const errors: ErrorWrapper[] = [];
  mathNodes.forEach((node: TinymathFunction) => {
    const { positionalArguments } = tinymathFunctions[node.name];
    const mandatoryArguments = positionalArguments.filter(({ optional }) => !optional);
    if (!node.args.length) {
      // we can stop here
      return errors.push(
        getMessageFromId({
          messageId: 'missingMathArgument',
          values: {
            operation: node.name,
            count: mandatoryArguments.length,
            params: mandatoryArguments.map(({ name }) => name).join(', '),
          },
          locations: getNodeLocation(node),
        })
      );
    }

    if (node.args.length > positionalArguments.length) {
      errors.push(
        getMessageFromId({
          messageId: 'tooManyArguments',
          values: {
            operation: node.name,
          },
          locations: getNodeLocation(node),
        })
      );
    }

    // no need to iterate all the arguments, one field is enough to trigger the error
    const hasFieldAsArgument = positionalArguments.some((requirements, index) => {
      const arg = node.args[index];
      if (arg != null && typeof arg !== 'number') {
        return arg.type === 'variable' && !missingVariableSet.has(arg.value);
      }
    });
    if (hasFieldAsArgument) {
      errors.push(
        getMessageFromId({
          messageId: 'shouldNotHaveField',
          values: {
            operation: node.name,
          },
          locations: getNodeLocation(node),
        })
      );
    }

    // if there is only 1 mandatory arg, this is already handled by the wrongFirstArgument check
    if (mandatoryArguments.length > 1 && node.args.length < mandatoryArguments.length) {
      const missingArgs = mandatoryArguments.filter((_, i) => node.args[i] == null);
      const [missingArgsWithAlternatives, missingArgsWithoutAlternative] = partition(
        missingArgs,
        (
          v
        ): v is {
          name: string;
          alternativeWhenMissing: string;
        } => v.alternativeWhenMissing != null
      );

      if (missingArgsWithoutAlternative.length) {
        errors.push(
          getMessageFromId({
            messageId: 'missingMathArgument',
            values: {
              operation: node.name,
              count: mandatoryArguments.length - node.args.length,
              params: missingArgsWithoutAlternative.map(({ name }) => name).join(', '),
            },
            locations: getNodeLocation(node),
          })
        );
      }
      if (missingArgsWithAlternatives.length) {
        // pick only the first missing argument alternative
        const [firstArg] = missingArgsWithAlternatives;
        errors.push(
          getMessageFromId({
            messageId: 'useAlternativeFunction',
            values: {
              operation: node.name,
              params: firstArg.name,
              alternativeFn: firstArg.alternativeWhenMissing,
            },
            locations: getNodeLocation(node),
          })
        );
      }
    }
    const wrongTypeArgumentIndexes = positionalArguments
      .map(({ type }, index) => {
        const arg = node.args[index];
        if (arg != null) {
          const argType = getArgumentType(arg, operations);
          if (argType && argType !== type) {
            return index;
          }
        }
      })
      .filter(nonNullable);
    for (const wrongTypeArgumentIndex of wrongTypeArgumentIndexes) {
      const arg = node.args[wrongTypeArgumentIndex];
      errors.push(
        getMessageFromId({
          messageId: 'wrongTypeArgument',
          values: {
            operation: node.name,
            name: positionalArguments[wrongTypeArgumentIndex].name,
            type: getArgumentType(arg, operations) || 'number',
            expectedType: positionalArguments[wrongTypeArgumentIndex].type || '',
          },
          locations: getNodeLocation(node),
        })
      );
    }
  });
  return errors;
}

function validateFieldArguments(
  node: TinymathFunction,
  variables: Array<string | number | TinymathVariable>,
  {
    isFieldOperation,
    firstArg,
    returnedType,
  }: {
    isFieldOperation: boolean;
    firstArg: TinymathAST;
    returnedType: 'ratio' | 'ordinal' | 'interval' | undefined;
  }
) {
  const fields = variables.filter(
    (arg) => isArgumentValidType(arg, 'variable') && !isMathNode(arg)
  );
  const errors = [];
  if (isFieldOperation && (fields.length > 1 || (fields.length === 1 && fields[0] !== firstArg))) {
    errors.push(
      getMessageFromId({
        messageId: 'tooManyFirstArguments',
        values: {
          operation: node.name,
          type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
            defaultMessage: 'field',
          }),
          supported: 1,
          text: (fields as TinymathVariable[]).map(({ text }) => text).join(', '),
        },
        locations: getNodeLocation(node),
      })
    );
  }
  if (isFieldOperation && fields.length === 1 && fields[0] === firstArg) {
    if (returnedType === 'ordinal') {
      errors.push(
        getMessageFromId({
          messageId: 'wrongReturnedType',
          values: {
            text: node.text ?? `${node.name}(${getValueOrName(firstArg)})`,
          },
          locations: getNodeLocation(node),
        })
      );
    }
  }
  if (!isFieldOperation && fields.length) {
    errors.push(
      getMessageFromId({
        messageId: 'wrongArgument',
        values: {
          operation: node.name,
          text: (fields as TinymathVariable[]).map(({ text }) => text).join(', '),
          type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
            defaultMessage: 'field',
          }),
        },
        locations: getNodeLocation(node),
      })
    );
  }
  return errors;
}

function validateFunctionArguments(
  node: TinymathFunction,
  functions: TinymathFunction[],
  requiredFunctions: number = 0,
  {
    isFieldOperation,
    firstArgValidation,
    type,
  }: { isFieldOperation: boolean; firstArgValidation: boolean; type: string }
) {
  const errors = [];
  // For math operation let the native operation run its own validation
  const [esOperations, mathOperations] = partition(functions, (arg) => !isMathNode(arg));
  if (esOperations.length > requiredFunctions) {
    if (isFieldOperation) {
      errors.push(
        getMessageFromId({
          messageId: 'wrongArgument',
          values: {
            operation: node.name,
            text: (esOperations as TinymathFunction[]).map(({ text }) => text).join(', '),
            type: i18n.translate('xpack.lens.indexPattern.formulaMetricValue', {
              defaultMessage: 'metric',
            }),
          },
          locations: getNodeLocation(node),
        })
      );
    } else {
      errors.push(
        getMessageFromId({
          messageId: 'tooManyFirstArguments',
          values: {
            operation: node.name,
            type,
            supported: requiredFunctions,
            text: (esOperations as TinymathFunction[]).map(({ text }) => text).join(', '),
          },
          locations: getNodeLocation(node),
        })
      );
    }
  }
  // full reference operation have another way to handle math operations
  if (
    isFieldOperation &&
    ((!firstArgValidation && mathOperations.length) || mathOperations.length > 1)
  ) {
    errors.push(
      getMessageFromId({
        messageId: 'wrongArgument',
        values: {
          operation: node.name,
          type,
          text: (mathOperations as TinymathFunction[]).map(({ text }) => text).join(', '),
        },
        locations: getNodeLocation(node),
      })
    );
  }
  return errors;
}
