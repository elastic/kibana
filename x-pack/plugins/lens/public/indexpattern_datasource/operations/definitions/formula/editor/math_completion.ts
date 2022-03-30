/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, startsWith } from 'lodash';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import {
  parse,
  TinymathLocation,
  TinymathAST,
  TinymathFunction,
  TinymathVariable,
  TinymathNamedArgument,
} from '@kbn/tinymath';
import type {
  QuerySuggestion,
  UnifiedSearchPublicPluginStart,
} from '../../../../../../../../../src/plugins/unified_search/public';
import { IndexPattern } from '../../../../types';
import { memoizedGetAvailableOperationsByMetadata } from '../../../operations';
import { tinymathFunctions, groupArgsByType, unquotedStringRegex } from '../util';
import type { GenericOperationDefinition } from '../..';
import { getFunctionSignatureLabel, getHelpTextContent } from './formula_help';
import { hasFunctionFieldArgument } from '../validation';
import { timeShiftOptions, timeShiftOptionOrder } from '../../../../time_shift_utils';
import { parseTimeShift } from '../../../../../../../../../src/plugins/data/common';

export enum SUGGESTION_TYPE {
  FIELD = 'field',
  NAMED_ARGUMENT = 'named_argument',
  FUNCTIONS = 'functions',
  KQL = 'kql',
  SHIFTS = 'shifts',
}

export type LensMathSuggestion =
  | string
  | {
      label: string;
      type: 'operation' | 'math';
    }
  | QuerySuggestion;

export interface LensMathSuggestions {
  list: LensMathSuggestion[];
  type: SUGGESTION_TYPE;
  range?: monaco.IRange;
}

function inLocation(cursorPosition: number, location: TinymathLocation) {
  return cursorPosition >= location.min && cursorPosition < location.max;
}

const MARKER = 'LENS_MATH_MARKER';

export function getInfoAtZeroIndexedPosition(
  ast: TinymathAST,
  zeroIndexedPosition: number,
  parent?: TinymathFunction
): undefined | { ast: TinymathAST; parent?: TinymathFunction } {
  if (typeof ast === 'number') {
    return;
  }
  // +, -, *, and / do not have location any more
  if (ast.location && !inLocation(zeroIndexedPosition, ast.location)) {
    return;
  }
  if (ast.type === 'function') {
    const [match] = ast.args
      .map((arg) => getInfoAtZeroIndexedPosition(arg, zeroIndexedPosition, ast))
      .filter((a) => a);
    if (match) {
      return match;
    } else if (ast.location) {
      return { ast };
    } else {
      // None of the arguments match, but we don't know the position so it's not a match
      return;
    }
  }
  return {
    ast,
    parent,
  };
}

export function offsetToRowColumn(expression: string, offset: number): monaco.Position {
  const lines = expression.split(/\n/);
  let remainingChars = offset;
  let lineNumber = 1;
  for (const line of lines) {
    if (line.length >= remainingChars) {
      return new monaco.Position(lineNumber, remainingChars + 1);
    }
    remainingChars -= line.length + 1;
    lineNumber++;
  }

  throw new Error('Algorithm failure');
}

export function monacoPositionToOffset(expression: string, position: monaco.Position): number {
  const lines = expression.split(/\n/);
  return lines
    .slice(0, position.lineNumber)
    .reduce(
      (prev, current, index) =>
        prev + (index === position.lineNumber - 1 ? position.column - 1 : current.length + 1),
      0
    );
}

export async function suggest({
  expression,
  zeroIndexedOffset,
  context,
  indexPattern,
  operationDefinitionMap,
  unifiedSearch,
  dateHistogramInterval,
}: {
  expression: string;
  zeroIndexedOffset: number;
  context: monaco.languages.CompletionContext;
  indexPattern: IndexPattern;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dateHistogramInterval?: number;
}): Promise<LensMathSuggestions> {
  const text =
    expression.substr(0, zeroIndexedOffset) + MARKER + expression.substr(zeroIndexedOffset);
  try {
    const ast = parse(text);

    const tokenInfo = getInfoAtZeroIndexedPosition(ast, zeroIndexedOffset);
    const tokenAst = tokenInfo?.ast;

    const isNamedArgument =
      tokenInfo?.parent &&
      typeof tokenAst !== 'number' &&
      tokenAst &&
      'type' in tokenAst &&
      tokenAst.type === 'namedArgument';
    if (tokenInfo?.parent && (context.triggerCharacter === '=' || isNamedArgument)) {
      return await getNamedArgumentSuggestions({
        ast: tokenAst as TinymathNamedArgument,
        unifiedSearch,
        indexPattern,
        dateHistogramInterval,
      });
    } else if (tokenInfo?.parent) {
      return getArgumentSuggestions(
        tokenInfo.parent,
        tokenInfo.parent.args.findIndex((a) => a === tokenAst),
        text,
        indexPattern,
        operationDefinitionMap
      );
    }
    if (
      typeof tokenAst === 'object' &&
      Boolean(tokenAst.type === 'variable' || tokenAst.type === 'function')
    ) {
      const nameWithMarker = tokenAst.type === 'function' ? tokenAst.name : tokenAst.value;
      return getFunctionSuggestions(
        nameWithMarker.split(MARKER)[0],
        indexPattern,
        operationDefinitionMap
      );
    }
  } catch (e) {
    // Fail silently
  }
  return { list: [], type: SUGGESTION_TYPE.FIELD };
}

export function getPossibleFunctions(
  indexPattern: IndexPattern,
  operationDefinitionMap?: Record<string, GenericOperationDefinition>
) {
  const available = memoizedGetAvailableOperationsByMetadata(indexPattern, operationDefinitionMap);
  const possibleOperationNames: string[] = [];
  available.forEach((a) => {
    if (a.operationMetaData.dataType === 'number' && !a.operationMetaData.isBucketed) {
      possibleOperationNames.push(
        ...a.operations.filter((o) => o.type !== 'managedReference').map((o) => o.operationType)
      );
    }
  });

  return [...uniq(possibleOperationNames), ...Object.keys(tinymathFunctions)];
}

function getFunctionSuggestions(
  prefix: string,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  return {
    list: uniq(
      getPossibleFunctions(indexPattern, operationDefinitionMap).filter((func) =>
        startsWith(func, prefix)
      )
    ).map((func) => ({ label: func, type: 'operation' as const })),
    type: SUGGESTION_TYPE.FUNCTIONS,
  };
}

function getArgumentSuggestions(
  ast: TinymathFunction,
  position: number,
  expression: string,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { name } = ast;
  const operation = operationDefinitionMap[name];
  if (!operation && !tinymathFunctions[name]) {
    return { list: [], type: SUGGESTION_TYPE.FIELD };
  }

  const tinymathFunction = tinymathFunctions[name];
  if (tinymathFunction) {
    if (tinymathFunction.positionalArguments[position]) {
      return {
        list: uniq(getPossibleFunctions(indexPattern, operationDefinitionMap)).map((f) => ({
          type: 'math' as const,
          label: f,
        })),
        type: SUGGESTION_TYPE.FUNCTIONS,
      };
    }
    return { list: [], type: SUGGESTION_TYPE.FIELD };
  }

  if (position > 0 || !hasFunctionFieldArgument(operation.type)) {
    const { namedArguments } = groupArgsByType(ast.args);
    const list = [];
    if (operation.filterable) {
      const hasFilterArgument = namedArguments.find(
        (arg) => arg.name === 'kql' || arg.name === 'lucene'
      );
      if (!hasFilterArgument) {
        list.push('kql');
        list.push('lucene');
      }
    }
    if (operation.shiftable) {
      if (!namedArguments.find((arg) => arg.name === 'shift')) {
        list.push('shift');
      }
    }
    if ('operationParams' in operation) {
      // Exclude any previously used named args
      list.push(
        ...operation
          .operationParams!.filter(
            (param) =>
              // Keep the param if it's the first use
              !namedArguments.find((arg) => arg.name === param.name)
          )
          .map((p) => p.name)
      );
    }
    return { list, type: SUGGESTION_TYPE.NAMED_ARGUMENT };
  }

  if (operation.input === 'field' && position === 0) {
    const available = memoizedGetAvailableOperationsByMetadata(
      indexPattern,
      operationDefinitionMap
    );
    // TODO: This only allow numeric functions, will reject last_value(string) for example.
    const validOperation = available.find(
      ({ operationMetaData }) =>
        operationMetaData.dataType === 'number' && !operationMetaData.isBucketed
    );
    if (validOperation) {
      const fields = validOperation.operations
        .filter((op) => op.operationType === operation.type)
        .map((op) => ('field' in op ? op.field : undefined))
        .filter((field) => field);
      const fieldArg = ast.args[0];
      const location = typeof fieldArg !== 'string' && (fieldArg as TinymathVariable).location;
      let range: monaco.IRange | undefined;
      if (location) {
        const start = offsetToRowColumn(expression, location.min);
        // This accounts for any characters that the user has already typed
        const end = offsetToRowColumn(expression, location.max - MARKER.length);
        range = monaco.Range.fromPositions(start, end);
      }
      return { list: fields as string[], type: SUGGESTION_TYPE.FIELD, range };
    } else {
      return { list: [], type: SUGGESTION_TYPE.FIELD };
    }
  }

  if (operation.input === 'fullReference') {
    const available = memoizedGetAvailableOperationsByMetadata(
      indexPattern,
      operationDefinitionMap
    );
    const possibleOperationNames: string[] = [];
    available.forEach((a) => {
      if (
        operation.requiredReferences.some((requirement) =>
          requirement.validateMetadata(a.operationMetaData)
        )
      ) {
        possibleOperationNames.push(
          ...a.operations
            .filter((o) =>
              operation.requiredReferences.some((requirement) => requirement.input.includes(o.type))
            )
            .map((o) => o.operationType)
        );
      }
    });
    return {
      list: uniq(possibleOperationNames).map((n) => ({ label: n, type: 'operation' as const })),
      type: SUGGESTION_TYPE.FUNCTIONS,
    };
  }

  return { list: [], type: SUGGESTION_TYPE.FIELD };
}

export async function getNamedArgumentSuggestions({
  ast,
  unifiedSearch,
  indexPattern,
  dateHistogramInterval,
}: {
  ast: TinymathNamedArgument;
  indexPattern: IndexPattern;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dateHistogramInterval?: number;
}) {
  if (ast.name === 'shift') {
    return {
      list: timeShiftOptions
        .filter(({ value }) => {
          if (typeof dateHistogramInterval === 'undefined') return true;
          const parsedValue = parseTimeShift(value);
          return (
            parsedValue !== 'previous' &&
            (parsedValue === 'invalid' ||
              Number.isInteger(parsedValue.asMilliseconds() / dateHistogramInterval))
          );
        })
        .map(({ value }) => value),
      type: SUGGESTION_TYPE.SHIFTS,
    };
  }
  if (ast.name !== 'kql' && ast.name !== 'lucene') {
    return { list: [], type: SUGGESTION_TYPE.KQL };
  }
  if (!unifiedSearch.autocomplete.hasQuerySuggestions(ast.name === 'kql' ? 'kuery' : 'lucene')) {
    return { list: [], type: SUGGESTION_TYPE.KQL };
  }

  const query = ast.value.split(MARKER)[0];
  const position = ast.value.indexOf(MARKER) + 1;

  const suggestions = await unifiedSearch.autocomplete.getQuerySuggestions({
    language: ast.name === 'kql' ? 'kuery' : 'lucene',
    query,
    selectionStart: position,
    selectionEnd: position,
    indexPatterns: [indexPattern],
    boolFilter: [],
  });
  return {
    list: suggestions ?? [],
    type: SUGGESTION_TYPE.KQL,
  };
}

const TRIGGER_SUGGESTION_COMMAND = {
  title: 'Trigger Suggestion Dialog',
  id: 'editor.action.triggerSuggest',
};

export function getSuggestion(
  suggestion: LensMathSuggestion,
  type: SUGGESTION_TYPE,
  operationDefinitionMap: Record<string, GenericOperationDefinition>,
  triggerChar: string | undefined,
  range?: monaco.IRange
): monaco.languages.CompletionItem {
  let kind: monaco.languages.CompletionItemKind = monaco.languages.CompletionItemKind.Method;
  let label: string =
    typeof suggestion === 'string'
      ? suggestion
      : 'label' in suggestion
      ? suggestion.label
      : suggestion.text;
  let insertText: string | undefined;
  let insertTextRules: monaco.languages.CompletionItem['insertTextRules'];
  let detail: string = '';
  let command: monaco.languages.CompletionItem['command'];
  let sortText: string = '';
  const filterText: string = label;

  switch (type) {
    case SUGGESTION_TYPE.SHIFTS:
      sortText = String(timeShiftOptionOrder[label]).padStart(4, '0');
      break;
    case SUGGESTION_TYPE.FIELD:
      kind = monaco.languages.CompletionItemKind.Value;
      // Look for unsafe characters
      if (unquotedStringRegex.test(label)) {
        insertText = `'${label.replaceAll(`'`, "\\'")}'`;
      }
      break;
    case SUGGESTION_TYPE.FUNCTIONS:
      insertText = `${label}($0)`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      if (typeof suggestion !== 'string') {
        if ('text' in suggestion) break;
        label = getFunctionSignatureLabel(suggestion.label, operationDefinitionMap);
        const tinymathFunction = tinymathFunctions[suggestion.label];
        if (tinymathFunction) {
          detail = 'TinyMath';
          kind = monaco.languages.CompletionItemKind.Method;
        } else {
          kind = monaco.languages.CompletionItemKind.Constant;
          detail = 'Elasticsearch';
          // Always put ES functions first
          sortText = `0${label}`;
          command = TRIGGER_SUGGESTION_COMMAND;
        }
      }
      break;
    case SUGGESTION_TYPE.NAMED_ARGUMENT:
      kind = monaco.languages.CompletionItemKind.Keyword;
      if (label === 'kql' || label === 'lucene' || label === 'shift') {
        command = TRIGGER_SUGGESTION_COMMAND;
        insertText = `${label}='$0'`;
        insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
        sortText = `zzz${label}`;
      }
      label = `${label}=`;
      detail = '';
      break;
    case SUGGESTION_TYPE.KQL:
      if (triggerChar === ':') {
        insertText = `${triggerChar} ${label}`;
      } else {
        // concatenate KQL suggestion for faster query composition
        command = TRIGGER_SUGGESTION_COMMAND;
      }
      if (label.includes(`'`)) {
        insertText = (insertText || label).replaceAll(`'`, "\\'");
      }
      break;
  }

  return {
    detail,
    kind,
    label,
    insertText: insertText ?? label,
    insertTextRules,
    command,
    additionalTextEdits: [],
    // @ts-expect-error Monaco says this type is required, but provides a default value
    range,
    sortText,
    filterText,
  };
}

function getOperationTypeHelp(
  name: string,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const { description: descriptionInMarkdown, examples } = getHelpTextContent(
    name,
    operationDefinitionMap
  );
  const examplesInMarkdown = examples.length
    ? `\n\n**${i18n.translate('xpack.lens.formulaExampleMarkdown', {
        defaultMessage: 'Examples',
      })}**

  ${examples.map((example) => `\`${example}\``).join('\n\n')}`
    : '';
  return {
    value: `${descriptionInMarkdown}${examplesInMarkdown}`,
  };
}

function getSignaturesForFunction(
  name: string,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  if (tinymathFunctions[name]) {
    const stringify = getFunctionSignatureLabel(name, operationDefinitionMap);
    const documentation = tinymathFunctions[name].help.replace(/\n/g, '\n\n');
    return [
      {
        label: stringify,
        documentation: { value: documentation },
        parameters: tinymathFunctions[name].positionalArguments.map((arg) => ({
          label: arg.name,
          documentation: arg.optional
            ? i18n.translate('xpack.lens.formula.optionalArgument', {
                defaultMessage: 'Optional. Default value is {defaultValue}',
                values: {
                  defaultValue: arg.defaultValue,
                },
              })
            : '',
        })),
      },
    ];
  }
  if (operationDefinitionMap[name]) {
    const def = operationDefinitionMap[name];

    const firstParam: monaco.languages.ParameterInformation | null = hasFunctionFieldArgument(name)
      ? {
          label: def.input === 'field' ? 'field' : def.input === 'fullReference' ? 'function' : '',
        }
      : null;

    const functionLabel = getFunctionSignatureLabel(name, operationDefinitionMap, firstParam);
    const documentation = getOperationTypeHelp(name, operationDefinitionMap);
    if ('operationParams' in def && def.operationParams) {
      return [
        {
          label: functionLabel,
          parameters: [
            ...(firstParam ? [firstParam] : []),
            ...def.operationParams.map((arg) => ({
              label: `${arg.name}=${arg.type}`,
              documentation: arg.required
                ? i18n.translate('xpack.lens.formula.requiredArgument', {
                    defaultMessage: 'Required',
                  })
                : '',
            })),
          ],
          documentation,
        },
      ];
    }
    return [
      {
        label: functionLabel,
        parameters: firstParam ? [firstParam] : [],
        documentation,
      },
    ];
  }
  return [];
}

export function getSignatureHelp(
  expression: string,
  position: number,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
): monaco.languages.SignatureHelpResult {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text);

    const tokenInfo = getInfoAtZeroIndexedPosition(ast, position);

    let signatures: ReturnType<typeof getSignaturesForFunction> = [];
    let index = 0;
    if (tokenInfo?.parent) {
      const name = tokenInfo.parent.name;
      // reference equality is fine here because of the way the getInfo function works
      index = tokenInfo.parent.args.findIndex((arg) => arg === tokenInfo.ast);
      signatures = getSignaturesForFunction(name, operationDefinitionMap);
    } else if (typeof tokenInfo?.ast === 'object' && tokenInfo.ast.type === 'function') {
      const name = tokenInfo.ast.name;
      signatures = getSignaturesForFunction(name, operationDefinitionMap);
    }
    if (signatures.length) {
      return {
        value: {
          // remove the documentation
          signatures: signatures.map(({ documentation, ...signature }) => ({
            ...signature,
            // extract only the first section (usually few lines)
            documentation: { value: documentation.value.split('\n\n')[0] },
          })),
          activeParameter: index,
          activeSignature: 0,
        },
        dispose: () => {},
      };
    }
  } catch (e) {
    // do nothing
  }
  return {
    value: { signatures: [], activeParameter: 0, activeSignature: 0 },
    dispose: () => {},
  };
}

export function getHover(
  expression: string,
  position: number,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
): monaco.languages.Hover {
  try {
    const ast = parse(expression);

    const tokenInfo = getInfoAtZeroIndexedPosition(ast, position);

    if (!tokenInfo || typeof tokenInfo.ast === 'number' || !('name' in tokenInfo.ast)) {
      return { contents: [] };
    }

    const name = tokenInfo.ast.name;
    const signatures = getSignaturesForFunction(name, operationDefinitionMap);
    if (signatures.length) {
      const { label } = signatures[0];

      return {
        contents: [{ value: label }],
      };
    }
  } catch (e) {
    // do nothing
  }
  return { contents: [] };
}

export function getTokenInfo(expression: string, position: number) {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text);

    return getInfoAtZeroIndexedPosition(ast, position);
  } catch (e) {
    return;
  }
}
