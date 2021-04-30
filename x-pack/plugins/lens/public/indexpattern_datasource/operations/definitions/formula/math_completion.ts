/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, startsWith } from 'lodash';
import { monaco } from '@kbn/monaco';
import {
  parse,
  TinymathLocation,
  TinymathAST,
  TinymathFunction,
  TinymathNamedArgument,
} from '@kbn/tinymath';
import { DataPublicPluginStart, QuerySuggestion } from 'src/plugins/data/public';
import { IndexPattern } from '../../../types';
import { memoizedGetAvailableOperationsByMetadata } from '../../operations';
import { tinymathFunctions, groupArgsByType } from './util';
import type { GenericOperationDefinition } from '..';

export enum SUGGESTION_TYPE {
  FIELD = 'field',
  NAMED_ARGUMENT = 'named_argument',
  FUNCTIONS = 'functions',
  KQL = 'kql',
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
}

function inLocation(cursorPosition: number, location: TinymathLocation) {
  return cursorPosition >= location.min && cursorPosition < location.max;
}

const MARKER = 'LENS_MATH_MARKER';

function getInfoAtPosition(
  ast: TinymathAST,
  position: number,
  parent?: TinymathFunction
): undefined | { ast: TinymathAST; parent?: TinymathFunction } {
  if (typeof ast === 'number') {
    return;
  }
  if (!inLocation(position, ast.location)) {
    return;
  }
  if (ast.type === 'function') {
    const [match] = ast.args.map((arg) => getInfoAtPosition(arg, position, ast)).filter((a) => a);
    if (match) {
      return match.parent ? match : { ...match, parent: ast };
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
      return new monaco.Position(lineNumber, remainingChars);
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
        prev + index === position.lineNumber - 1 ? position.column : current.length,
      0
    );
}

export async function suggest({
  expression,
  position,
  context,
  indexPattern,
  operationDefinitionMap,
  data,
}: {
  expression: string;
  position: number;
  context: monaco.languages.CompletionContext;
  indexPattern: IndexPattern;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
  data: DataPublicPluginStart;
}): Promise<{ list: LensMathSuggestion[]; type: SUGGESTION_TYPE }> {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text);

    const tokenInfo = getInfoAtPosition(ast, position);
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
        data,
        indexPattern,
      });
    } else if (tokenInfo?.parent) {
      return getArgumentSuggestions(
        tokenInfo.parent,
        tokenInfo.parent.args.findIndex((a) => a === tokenAst),
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

  if (position > 0 || operation.type === 'count') {
    const { namedArguments } = groupArgsByType(ast.args);
    const list = [];
    if (operation.filterable) {
      if (!namedArguments.find((arg) => arg.name === 'kql')) {
        list.push('kql');
      }
      if (!namedArguments.find((arg) => arg.name === 'lucene')) {
        list.push('lucene');
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
      return { list: fields as string[], type: SUGGESTION_TYPE.FIELD };
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
  data,
  indexPattern,
}: {
  ast: TinymathNamedArgument;
  indexPattern: IndexPattern;
  data: DataPublicPluginStart;
}) {
  if (ast.name !== 'kql' && ast.name !== 'lucene') {
    return { list: [], type: SUGGESTION_TYPE.KQL };
  }
  if (!data.autocomplete.hasQuerySuggestions(ast.name === 'kql' ? 'kuery' : 'lucene')) {
    return { list: [], type: SUGGESTION_TYPE.KQL };
  }

  const before = ast.value.split(MARKER)[0];
  // TODO
  const suggestions = await data.autocomplete.getQuerySuggestions({
    language: 'kuery',
    query: ast.value.split(MARKER)[0],
    selectionStart: before.length,
    selectionEnd: before.length,
    indexPatterns: [indexPattern],
    boolFilter: [],
  });
  return { list: suggestions ?? [], type: SUGGESTION_TYPE.KQL };
}

export function getSuggestion(
  suggestion: LensMathSuggestion,
  type: SUGGESTION_TYPE,
  range: monaco.Range,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
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
    case SUGGESTION_TYPE.FIELD:
      kind = monaco.languages.CompletionItemKind.Value;
      break;
    case SUGGESTION_TYPE.FUNCTIONS:
      insertText = `${label}($0)`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      if (typeof suggestion !== 'string') {
        if ('text' in suggestion) break;
        const tinymathFunction = tinymathFunctions[suggestion.label];
        if (tinymathFunction) {
          label = `${label}(${tinymathFunction.positionalArguments
            .map(({ name }) => name)
            .join(', ')})`;
          detail = 'TinyMath';
          kind = monaco.languages.CompletionItemKind.Method;
        } else {
          const def = operationDefinitionMap[suggestion.label];
          kind = monaco.languages.CompletionItemKind.Constant;
          if (suggestion.label === 'count' && 'operationParams' in def) {
            label = `${label}(${def
              .operationParams!.map((p) => `${p.name}=${p.type}`)
              .join(', ')})`;
          } else if ('operationParams' in def) {
            label = `${label}(expression, ${def
              .operationParams!.map((p) => `${p.name}=${p.type}`)
              .join(', ')})`;
          } else {
            label = `${label}(expression)`;
          }
          detail = 'Elasticsearch';
          // Always put ES functions first
          sortText = `0${label}`;
        }
      }
      break;
    case SUGGESTION_TYPE.NAMED_ARGUMENT:
      kind = monaco.languages.CompletionItemKind.Keyword;
      if (label === 'kql' || label === 'lucene') {
        command = {
          title: 'Trigger Suggestion Dialog',
          id: 'editor.action.triggerSuggest',
        };
        insertText = `${label}='$0'`;
        insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
        sortText = `zzz${label}`;
      }
      label = `${label}=`;
      detail = '';
      break;
    case SUGGESTION_TYPE.KQL:
      if (label.includes(`'`)) {
        insertText = label.replaceAll(`'`, "\\'");
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
    range,
    sortText,
    filterText,
  };
}

export function getSignatureHelp(
  expression: string,
  position: number,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
): monaco.languages.SignatureHelpResult {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text);

    const tokenInfo = getInfoAtPosition(ast, position);

    if (tokenInfo?.parent) {
      const name = tokenInfo.parent.name;
      // reference equality is fine here because of the way the getInfo function works
      const index = tokenInfo.parent.args.findIndex((arg) => arg === tokenInfo.ast);

      if (tinymathFunctions[name]) {
        const stringify = `${name}(${tinymathFunctions[name].positionalArguments
          .map((arg) => arg.name)
          .join(', ')})`;
        return {
          value: {
            signatures: [
              {
                label: stringify,
                parameters: tinymathFunctions[name].positionalArguments.map((arg) => ({
                  label: arg.name,
                  documentation: arg.optional ? 'Optional' : '',
                })),
              },
            ],
            activeParameter: index,
            activeSignature: 0,
          },
          dispose: () => {},
        };
      } else if (operationDefinitionMap[name]) {
        const def = operationDefinitionMap[name];

        const firstParam: monaco.languages.ParameterInformation | null =
          name !== 'count'
            ? {
                label:
                  def.input === 'field' ? 'field' : def.input === 'fullReference' ? 'function' : '',
              }
            : null;
        if ('operationParams' in def) {
          return {
            value: {
              signatures: [
                {
                  label: `${name}(${
                    firstParam ? firstParam.label + ', ' : ''
                  }${def.operationParams!.map((arg) => `${arg.name}=${arg.type}`)})`,
                  parameters: [
                    ...(firstParam ? [firstParam] : []),
                    ...def.operationParams!.map((arg) => ({
                      label: `${arg.name}=${arg.type}`,
                      documentation: arg.required ? 'Required' : '',
                    })),
                  ],
                },
              ],
              activeParameter: index,
              activeSignature: 0,
            },
            dispose: () => {},
          };
        } else {
          return {
            value: {
              signatures: [
                {
                  label: `${name}(${firstParam ? firstParam.label : ''})`,
                  parameters: firstParam ? [firstParam] : [],
                },
              ],
              activeParameter: index,
              activeSignature: 0,
            },
            dispose: () => {},
          };
        }
      }
    }
  } catch (e) {
    // do nothing
  }
  return { value: { signatures: [], activeParameter: 0, activeSignature: 0 }, dispose: () => {} };
}

export function getHover(
  expression: string,
  position: number,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
): monaco.languages.Hover {
  try {
    const ast = parse(expression);

    const tokenInfo = getInfoAtPosition(ast, position);

    if (!tokenInfo || typeof tokenInfo.ast === 'number' || !('name' in tokenInfo.ast)) {
      return { contents: [] };
    }

    const name = tokenInfo.ast.name;

    if (tinymathFunctions[name]) {
      const stringify = `${name}(${tinymathFunctions[name].positionalArguments
        .map((arg) => arg.name)
        .join(', ')})`;
      return { contents: [{ value: stringify }] };
    } else if (operationDefinitionMap[name]) {
      const def = operationDefinitionMap[name];

      const firstParam: monaco.languages.ParameterInformation | null =
        name !== 'count'
          ? {
              label:
                def.input === 'field' ? 'field' : def.input === 'fullReference' ? 'function' : '',
            }
          : null;
      if ('operationParams' in def) {
        return {
          contents: [
            {
              value: `${name}(${
                firstParam ? firstParam.label + ', ' : ''
              }${def.operationParams!.map((arg) => `${arg.name}=${arg.type}`)})`,
            },
          ],
        };
      } else {
        return {
          contents: [{ value: `${name}(${firstParam ? firstParam.label : ''})` }],
        };
      }
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

    return getInfoAtPosition(ast, position);
  } catch (e) {
    return;
  }
}
