/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, startsWith } from 'lodash';
import { monaco } from '@kbn/monaco';

import { Parser } from 'pegjs';
import { parse, TinymathLocation, TinymathAST, TinymathFunction } from '@kbn/tinymath';
import { IndexPattern } from '../../../types';
import type { GenericOperationDefinition } from '..';
import { operationDefinitionMap } from '..';

export enum SUGGESTION_TYPE {
  FIELD = 'field',
  NAMED_ARGUMENT = 'named_argument',
  FUNCTIONS = 'functions',
}

export type LensMathSuggestion = GenericOperationDefinition | string;
export interface LensMathSuggestions {
  list: LensMathSuggestion[];
  type: SUGGESTION_TYPE;
}

function inLocation(cursorPosition: number, location: TinymathLocation) {
  return cursorPosition >= location.min && cursorPosition <= location.max;
}

function getArgumentsHelp(
  functionHelp: ILensFunction | undefined,
  functionArgs: FunctionArg[] = []
) {
  if (!functionHelp) {
    return [];
  }

  // Do not provide 'inputSeries' as argument suggestion for chainable functions
  const argsHelp = functionHelp.chainable ? functionHelp.args.slice(1) : functionHelp.args.slice(0);

  // ignore arguments that are already provided in function declaration
  const functionArgNames = functionArgs.map((arg) => arg.name);
  return argsHelp.filter((arg) => !functionArgNames.includes(arg.name));
}

async function extractSuggestionsFromParsedResult(
  result: ReturnType<Parser['parse']>,
  cursorPosition: number,
  functionList: ILensFunction[],
  argValueSuggestions: ArgValueSuggestions
) {
  const activeFunc = result.functions.find(({ location }: { location: Location }) =>
    inLocation(cursorPosition, location)
  );

  if (!activeFunc) {
    return;
  }

  const functionHelp = functionList.find(({ name }) => name === activeFunc.function);

  if (!functionHelp) {
    return;
  }

  // return function suggestion when cursor is outside of parentheses
  // location range includes '.', function name, and '('.
  const openParen = activeFunc.location.min + activeFunc.function.length + 2;
  if (cursorPosition < openParen) {
    return { list: [functionHelp], type: SUGGESTION_TYPE.FUNCTIONS };
  }

  // return argument value suggestions when cursor is inside argument value
  const activeArg = activeFunc.arguments.find((argument: FunctionArg) => {
    return inLocation(cursorPosition, argument.location);
  });
  if (
    activeArg &&
    activeArg.type === 'namedArg' &&
    inLocation(cursorPosition, activeArg.value.location)
  ) {
    const { function: functionName, arguments: functionArgs } = activeFunc;

    const {
      name: argName,
      value: { text: partialInput },
    } = activeArg;

    let valueSuggestions;
    if (argValueSuggestions.hasDynamicSuggestionsForArgument(functionName, argName)) {
      valueSuggestions = await argValueSuggestions.getDynamicSuggestionsForArgument(
        functionName,
        argName,
        functionArgs,
        partialInput
      );
    } else {
      const { suggestions: staticSuggestions } =
        functionHelp.args.find((arg) => arg.name === activeArg.name) || {};
      valueSuggestions = argValueSuggestions.getStaticSuggestionsForInput(
        partialInput,
        staticSuggestions
      );
    }
    return {
      list: valueSuggestions,
      type: SUGGESTION_TYPE.ARGUMENT_VALUE,
    };
  }

  // return argument suggestions
  const argsHelp = getArgumentsHelp(functionHelp, activeFunc.arguments);
  const argumentSuggestions = argsHelp.filter((arg) => {
    if (get(activeArg, 'type') === 'namedArg') {
      return startsWith(arg.name, activeArg.name);
    } else if (activeArg) {
      return startsWith(arg.name, activeArg.text);
    }
    return true;
  });
  return { list: argumentSuggestions, type: SUGGESTION_TYPE.ARGUMENTS };
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
  // const type = getType(ast);
  if (!inLocation(position, ast.location)) {
    return;
  }
  if (ast.type === 'function') {
    const [match] = ast.args.flatMap((arg) => getInfoAtPosition(arg, position, ast));
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
  word: monaco.editor.IWordAtPosition,
  indexPattern: IndexPattern
): Promise<{ list: LensMathSuggestion[]; type: SUGGESTION_TYPE }> {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text);

    const tokenInfo = getInfoAtPosition(ast, position);

    console.log(ast, getInfoAtPosition(ast, position));

    if (context.triggerCharacter === '=' && tokenInfo?.parent) {
      return getArgValueSuggestions(
        tokenInfo.parent.name,
        tokenInfo.parent.args[tokenInfo.parent.args.length - 1]
      );
    } else if (tokenInfo?.parent) {
      return getArgumentSuggestions(
        tokenInfo.parent.name,
        tokenInfo.parent.args.length,
        indexPattern
      );
    }
    if (tokenInfo) {
      return getFunctionSuggestions(word);
    }
  } catch (e) {
    // Fail silently
  }
  return { list: [], type: SUGGESTION_TYPE.FIELD };
}

function getFunctionSuggestions(word: monaco.editor.IWordAtPosition) {
  const list = Object.keys(operationDefinitionMap)
    .filter((func) => startsWith(func, word.word))
    .map((key) => operationDefinitionMap[key]);
  return { list, type: SUGGESTION_TYPE.FUNCTIONS };
}

function getArgumentSuggestions(name: string, position: number, indexPattern: IndexPattern) {
  const operation = operationDefinitionMap[name];
  if (!operation) {
    return { list: [], type: SUGGESTION_TYPE.FIELD };
  }

  const fields = indexPattern.fields
    .filter((field) => field.type === 'number')
    .map((field) => field.name);

  if (operation.input === 'field') {
    return { list: fields, type: SUGGESTION_TYPE.FIELD };
  }

  if (operation.input === 'fullReference') {
    if (operation.selectionStyle === 'field') {
      return { list: fields, type: SUGGESTION_TYPE.FIELD };
    }
    return { list: Object.keys(operationDefinitionMap), type: SUGGESTION_TYPE.FUNCTIONS };
  }

  return { list: [], type: SUGGESTION_TYPE.FIELD };
}

function getArgValueSuggestions(name: string, position: number) {
  return { list: [], type: SUGGESTION_TYPE.FIELD };
}

export function getSuggestion(
  suggestion: LensMathSuggestion,
  type: SUGGESTION_TYPE,
  range: monaco.Range
): monaco.languages.CompletionItem {
  let kind: monaco.languages.CompletionItemKind = monaco.languages.CompletionItemKind.Method;
  let insertText: string = typeof suggestion === 'string' ? suggestion : suggestion.type;
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
      insertText = `${insertText}`;

      break;
    case SUGGESTION_TYPE.FUNCTIONS:
      command = {
        title: 'Trigger Suggestion Dialog',
        id: 'editor.action.triggerSuggest',
      };
      kind = monaco.languages.CompletionItemKind.Function;
      insertText = `${insertText}($0)`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      detail = typeof suggestion === 'string' ? '' : `(${suggestion.displayName})`;

      break;
  }

  return {
    detail,
    insertText,
    insertTextRules,
    kind,
    label: insertText,
    // documentation: suggestion.help,
    command,
    range,
  };
}
