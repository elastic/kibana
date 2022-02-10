/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error untyped lib
import pluralize from 'pluralize';
import { ExpressionFunction, ExpressionFunctionParameter } from 'src/plugins/expressions';
import { functions as browserFunctions } from '../../../canvas_plugin_src/functions/browser';
import { functions as serverFunctions } from '../../../canvas_plugin_src/functions/server';
import { DATATABLE_COLUMN_TYPES } from '../../../common/lib';
import { isValidDataUrl } from '../../../../../../src/plugins/presentation_util/public';
import { getFunctionExamples, FunctionExample } from './function_examples';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const REQUIRED_ARG_ANNOTATION = '***';
const MULTI_ARG_ANNOTATION = '†';
const UNNAMED_ARG = '_Unnamed_';
const ANY_TYPE = '`any`';

const examplesDict = getFunctionExamples();

const fnList = [
  ...browserFunctions.map((fn) => fn().name),
  ...serverFunctions.map((fn) => fn().name),
  'asset',
  'clog',
  'createTable',
  'embeddable',
  'filters',
  'font',
  'image',
  'kibana',
  'mapColumn',
  'math',
  'mathColumn',
  'metric',
  'palette',
  'pie',
  'plot',
  'progress',
  'removeFilter',
  'repeatImage',
  'revealImage',
  'selectFilter',
  'shape',
  'timelion',
  'to',
  'uiSetting',
  'var',
  'var_set',

  // ignore unsupported embeddables functions for now
].filter((fn) => !['savedSearch'].includes(fn));

interface FunctionDictionary {
  [key: string]: ExpressionFunction[];
}

const wrapInBackTicks = (str: string) => `\`${str}\``;
const wrapInDoubleQuotes = (str: string) => (str.includes('"') ? str : `"${str}"`);
const stringSorter = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

// Converts reference to another function in a function's help text into an Asciidoc link
const addFunctionLinks = (help: string, options?: { ignoreList?: string[] }) => {
  const { ignoreList = [] } = options || {};
  fnList.forEach((name: string) => {
    const nameWithBackTicks = wrapInBackTicks(name);

    // ignore functions with the same name as data types, i.e. string, date
    if (
      !ignoreList.includes(name) &&
      !DATATABLE_COLUMN_TYPES.includes(name) &&
      help.includes(nameWithBackTicks)
    ) {
      help = help.replace(nameWithBackTicks, `<<${name}_fn>>`);
    }
  });

  return help;
};

export const generateFunctionReference = (functionDefinitions: ExpressionFunction[]) => {
  const functionDefs = functionDefinitions.filter((fn: ExpressionFunction) =>
    fnList.includes(fn.name)
  );
  const functionDictionary: FunctionDictionary = {};
  functionDefs.forEach((fn: ExpressionFunction) => {
    const firstLetter = fn.name[0];

    if (!functionDictionary[firstLetter]) {
      functionDictionary[firstLetter] = [];
    }

    functionDictionary[firstLetter].push(fn);
  });
  return `[role="xpack"]
[[canvas-function-reference]]
== Canvas function reference

Behind the scenes, Canvas is driven by a powerful expression language,
with dozens of functions and other capabilities, including table transforms,
type casting, and sub-expressions.

The Canvas expression language also supports <<canvas-tinymath-functions>>, which
perform complex math calculations.

A ${REQUIRED_ARG_ANNOTATION} denotes a required argument.

A ${MULTI_ARG_ANNOTATION} denotes an argument can be passed multiple times.

${createAlphabetLinks(functionDictionary)}

${createFunctionDocs(functionDictionary)}`;
};

const createAlphabetLinks = (functionDictionary: FunctionDictionary) => {
  return ALPHABET.map((letter: string) =>
    functionDictionary[letter] ? `<<${letter}_fns>>` : letter.toUpperCase()
  ).join(' | ');
};

const createFunctionDocs = (functionDictionary: FunctionDictionary) => {
  return Object.keys(functionDictionary)
    .sort()
    .map(
      (letter: string) => `[float]
[[${letter}_fns]]
== ${letter.toUpperCase()}

${functionDictionary[letter]
  .sort((a, b) => stringSorter(a.name, b.name))
  .map(getDocBlock)
  .join('\n')}`
    )
    .join('');
};

const getDocBlock = (fn: ExpressionFunction) => {
  const header = `[float]
[[${fn.name}_fn]]
=== \`${fn.name}\``;

  const input = fn.inputTypes;
  const output = fn.type;
  const args = fn.args;
  const examples = examplesDict[fn.name];
  const help = addFunctionLinks(fn.help);

  const argBlock =
    !args || Object.keys(args).length === 0
      ? ''
      : `\n[cols="3*^<"]
|===
|Argument |Type |Description

${getArgsTable(args)}
|===\n`;

  const examplesBlock = !examples ? `` : `${getExamplesBlock(examples)}`;

  return `${header}\n
${help}
${examplesBlock}
*Accepts:* ${input ? input.map(wrapInBackTicks).join(', ') : ANY_TYPE}\n${argBlock}
*Returns:* ${output ? wrapInBackTicks(output) : 'Depends on your input and arguments'}\n\n`;
};

const getArgsTable = (args: { [key: string]: ExpressionFunctionParameter<any> }) => {
  if (!args || Object.keys(args).length === 0) {
    return 'None';
  }

  const argNames = Object.keys(args);

  return argNames
    .sort((a: string, b: string) => {
      const argA = args[a];
      const argB = args[b];

      // sorts unnamed arg to the front
      if (a === '_' || (argA.aliases && argA.aliases.includes('_'))) {
        return -1;
      }
      if (b === '_' || (argB.aliases && argB.aliases.includes('_'))) {
        return 1;
      }
      return stringSorter(a, b);
    })
    .map((argName: string) => {
      const arg = args[argName];
      const types = arg.types;
      const aliases = arg.aliases ? [...arg.aliases] : [];
      let defaultValue = arg.default;
      const requiredAnnotation = arg.required === true ? ` ${REQUIRED_ARG_ANNOTATION}` : '';
      const multiAnnotation = arg.multi === true ? ` ${MULTI_ARG_ANNOTATION}` : '';

      if (typeof defaultValue === 'string') {
        defaultValue = defaultValue.replace('{', '${').replace(/[\r\n/]+/g, '');
        if (types && types.includes('string')) {
          defaultValue = wrapInDoubleQuotes(defaultValue);
        }
      }

      let displayName = '';

      if (argName === '_') {
        displayName = UNNAMED_ARG;
      } else if (aliases && aliases.includes('_')) {
        displayName = UNNAMED_ARG;
        aliases[aliases.indexOf('_')] = argName;
      } else {
        displayName = wrapInBackTicks(argName);
      }

      const aliasList =
        aliases && aliases.length
          ? `\n\n${pluralize('Alias', aliases.length)}: ${aliases
              .sort()
              .map(wrapInBackTicks)
              .join(', ')}`
          : '';

      let defaultBlock = '';

      if (isValidDataUrl(arg.default)) {
        defaultBlock = getDataUrlExampleBlock(displayName, arg.default);
      } else {
        defaultBlock =
          typeof defaultValue !== 'undefined' ? `\n\nDefault: \`${defaultValue}\`` : '';
      }

      return `|${displayName}${requiredAnnotation}${multiAnnotation}${aliasList}
|${types && types.length ? types.map(wrapInBackTicks).join(', ') : ANY_TYPE}
|${arg.help ? addFunctionLinks(arg.help, { ignoreList: argNames }) : ''}${defaultBlock}`;
    })
    .join('\n\n');
};

const getDataUrlExampleBlock = (
  argName: string,
  value: string
) => `\n\nExample value for the ${argName} argument, formatted as a \`base64\` data URL:
[source, url]
------------
${value}
------------`;

const getExamplesBlock = (examples: FunctionExample) => {
  const { syntax, usage } = examples;
  const { expression, help } = usage || {};
  const syntaxBlock = syntax
    ? `\n*Expression syntax*
[source,js]
----
${syntax}
----\n`
    : '';

  const codeBlock = expression
    ? `\n*Code example*
[source,text]
----
${expression}
----\n`
    : '';

  const codeHelp = help ? `${help}\n` : '';

  return `${syntaxBlock}${codeBlock}${codeHelp}`;
};
