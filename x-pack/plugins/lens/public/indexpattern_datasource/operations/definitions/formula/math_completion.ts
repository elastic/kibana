/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, startsWith } from 'lodash';
import { monaco } from '@kbn/monaco';

import { parse, TinymathLocation, TinymathAST, TinymathFunction } from '@kbn/tinymath';
import { IndexPattern } from '../../../types';
import { getAvailableOperationsByMetadata } from '../../operations';
import { tinymathFunctions } from './util';
import type { GenericOperationDefinition } from '..';

export enum SUGGESTION_TYPE {
  FIELD = 'field',
  NAMED_ARGUMENT = 'named_argument',
  FUNCTIONS = 'functions',
}

export type LensMathSuggestion =
  | string
  | {
      label: string;
      type: 'operation' | 'math';
    };

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

export async function suggest(
  expression: string,
  position: number,
  context: monaco.languages.CompletionContext,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>,
  word?: monaco.editor.IWordAtPosition
): Promise<{ list: LensMathSuggestion[]; type: SUGGESTION_TYPE }> {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text);

    const tokenInfo = getInfoAtPosition(ast, position);

    if (context.triggerCharacter === '=' && tokenInfo?.parent) {
      // TODO
    } else if (tokenInfo?.parent) {
      return getArgumentSuggestions(
        tokenInfo.parent.name,
        tokenInfo.parent.args.length - 1,
        indexPattern,
        operationDefinitionMap
      );
    }
    if (tokenInfo && word) {
      return getFunctionSuggestions(word, indexPattern);
    }
  } catch (e) {
    // Fail silently
  }
  return { list: [], type: SUGGESTION_TYPE.FIELD };
}

export function getPossibleFunctions(indexPattern: IndexPattern) {
  const available = getAvailableOperationsByMetadata(indexPattern);
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

function getFunctionSuggestions(word: monaco.editor.IWordAtPosition, indexPattern: IndexPattern) {
  return {
    list: uniq(
      getPossibleFunctions(indexPattern).filter((func) => startsWith(func, word.word))
    ).map((func) => ({ label: func, type: 'operation' as const })),
    type: SUGGESTION_TYPE.FUNCTIONS,
  };
}

function getArgumentSuggestions(
  name: string,
  position: number,
  indexPattern: IndexPattern,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  const operation = operationDefinitionMap[name];
  if (!operation && !tinymathFunctions[name]) {
    return { list: [], type: SUGGESTION_TYPE.FIELD };
  }

  const tinymathFunction = tinymathFunctions[name];
  if (tinymathFunction) {
    if (tinymathFunction.positionalArguments[position]) {
      return {
        list: uniq(getPossibleFunctions(indexPattern)).map((f) => ({
          type: 'math' as const,
          label: f,
        })),
        type: SUGGESTION_TYPE.FUNCTIONS,
      };
    }
    return { list: [], type: SUGGESTION_TYPE.FIELD };
  }

  if (position > 0) {
    if ('operationParams' in operation) {
      const suggestedParam = operation.operationParams!.map((p) => p.name);
      return {
        list: suggestedParam,
        type: SUGGESTION_TYPE.NAMED_ARGUMENT,
      };
    }
    return { list: [], type: SUGGESTION_TYPE.FIELD };
  }

  if (operation.input === 'field' && position === 0) {
    const fields = indexPattern.fields
      .filter((field) => field.type === 'number')
      .map((field) => field.name);
    return { list: fields, type: SUGGESTION_TYPE.FIELD };
  }

  if (operation.input === 'fullReference') {
    const available = getAvailableOperationsByMetadata(indexPattern);
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

export function getSuggestion(
  suggestion: LensMathSuggestion,
  type: SUGGESTION_TYPE,
  range: monaco.Range,
  operationDefinitionMap: Record<string, GenericOperationDefinition>
): monaco.languages.CompletionItem {
  let kind: monaco.languages.CompletionItemKind = monaco.languages.CompletionItemKind.Method;
  let label: string = typeof suggestion === 'string' ? suggestion : suggestion.label;
  let insertText: string | undefined;
  let insertTextRules: monaco.languages.CompletionItem['insertTextRules'];
  let detail: string = '';
  let command: monaco.languages.CompletionItem['command'];

  switch (type) {
    case SUGGESTION_TYPE.FIELD:
      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Value;
      break;
    case SUGGESTION_TYPE.FUNCTIONS:
      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Function;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      if (typeof suggestion !== 'string') {
        const tinymathFunction = tinymathFunctions[suggestion.label];
        if (tinymathFunction) {
          insertText = `${label}($0)`;
          label = `${label}(${tinymathFunction.positionalArguments
            .map(({ name }) => name)
            .join(', ')})`;
          detail = 'TinyMath';
        } else {
          const def = operationDefinitionMap[suggestion.label];
          insertText = `${label}($0)`;
          if ('operationParams' in def) {
            label = `${label}(expression, ${def
              .operationParams!.map((p) => `${p.name}=${p.type}`)
              .join(', ')}`;
          } else {
            label = `${label}(expression)`;
          }
          detail = 'Elasticsearch';
        }
      }
      break;
    case SUGGESTION_TYPE.NAMED_ARGUMENT:
      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Field;
      insertText = `${insertText}=`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      detail = '';

      break;
  }

  return {
    detail,
    kind,
    label,
    insertText: insertText ?? label,
    insertTextRules,
    command,
    range,
  };
}
