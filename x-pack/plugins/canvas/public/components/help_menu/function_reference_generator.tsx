/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { AnyExpressionFunctionDefinition } from 'src/plugins/expressions';
import { functionsRegistry } from 'plugins/interpreter/registries';
import { EuiButtonEmpty } from '@elastic/eui';
// @ts-ignore untyped lib
import pluralize from 'pluralize';
import copy from 'copy-to-clipboard';
import { functions as browserFunctions } from '../../../canvas_plugin_src/functions/browser';
import { functions as serverFunctions } from '../../../canvas_plugin_src/functions/server';
import { ArgumentType } from '../../../types';
import { notifyService } from '../../services';
import { isValidDataUrl, DATATABLE_COLUMN_TYPES } from '../../../common/lib';
import { getFunctionExamples, FunctionExample } from './examples';

const examplesDict = getFunctionExamples();

const requiredArgAnnotation = '***';
const multiArgAnnotation = '†';
const unnamedArg = '_Unnamed_';
const anyType = '`any`';
const fnList = [
  ...browserFunctions.map(fn => fn().name),
  ...serverFunctions.map(fn => fn().name),
  'asset',
  'filters',
  'font',
  'timelion',
  'to',
  // ignore embeddables functions for now
].filter(fn => !['savedMap', 'savedVisualization', 'savedSearch'].includes(fn));

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

interface FunctionDictionary {
  [key: string]: AnyExpressionFunctionDefinition[];
}

const wrapInBackTicks = (str: string) => `\`${str}\``;
const stringSorter = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const addFunctionLinks = (help: string, options?: { blacklist?: string[] }) => {
  const { blacklist = [] } = options || {};
  fnList.forEach((name: string) => {
    const nameWithBackTicks = wrapInBackTicks(name);

    // ignore functions with the same name as data types, i.e. string, date
    if (
      !blacklist.includes(name) &&
      !DATATABLE_COLUMN_TYPES.includes(name) &&
      help.includes(nameWithBackTicks)
    ) {
      help = help.replace(nameWithBackTicks, `<<${name}_fn>>`);
    }
  });

  return help;
};

const createDocs = () => {
  const functionDefs = functionsRegistry
    .toArray()
    .filter((fn: AnyExpressionFunctionDefinition) => fnList.includes(fn.name));

  const functionDict: FunctionDictionary = {};
  functionDefs.forEach((fn: AnyExpressionFunctionDefinition) => {
    const firstLetter = fn.name[0];

    if (!functionDict[firstLetter]) {
      functionDict[firstLetter] = [];
    }

    functionDict[firstLetter].push(fn);
  });
  return `[role="xpack"]
[[canvas-function-reference]]
== Canvas function reference

Behind the scenes, Canvas is driven by a powerful expression language,
with dozens of functions and other capabilities, including table transforms,
type casting, and sub-expressions.

The Canvas expression language also supports <<canvas-tinymath-functions>>, which
perform complex math calculations.

A ${requiredArgAnnotation} denotes a required argument.

A ${multiArgAnnotation} denotes an argument can be passed multiple times.

${createAlphabetLinks(functionDict)}

${createFunctionDocs(functionDict)}`;
};

const createAlphabetLinks = (functionDict: FunctionDictionary) => {
  return ALPHABET.map(letter =>
    functionDict[letter] ? `<<${letter}_fns>>` : letter.toUpperCase()
  ).join(' | ');
};

const createFunctionDocs = (functionDict: FunctionDictionary) => {
  return Object.keys(functionDict)
    .sort()
    .map(
      (letter: string) => `[float]
[[${letter}_fns]]
== ${letter.toUpperCase()}

${functionDict[letter]
  .sort((a, b) => stringSorter(a.name, b.name))
  .map(toDocBlock)
  .join('\n')}`
    )
    .join('');
};

const toDocBlock = (fn: AnyExpressionFunctionDefinition) => {
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
*Accepts:* ${input ? input.map(wrapInBackTicks).join(', ') : anyType}\n${argBlock}
*Returns:* ${output ? wrapInBackTicks(output) : 'Depends on your input and arguments'}\n\n`;
};

const getArgsTable = (args: Array<ArgumentType<any>>) => {
  if (!args || Object.keys(args).length === 0) {
    return 'None';
  }

  const argNames = Object.keys(args);

  return argNames
    .sort((a: string, b: string) => {
      const argA = args[a];
      const argB = args[b];

      // sorts unnamed arg to the front
      if (argA.name === '_' || (argA.aliases && argA.aliases.includes('_'))) {
        return -1;
      }
      if (argB.name === '_' || (argB.aliases && argB.aliases.includes('_'))) {
        return 1;
      }
      return stringSorter(argA.name, argB.name);
    })
    .map((argName: string) => {
      const arg = args[argName];
      const types = arg.types;
      const aliases = [...arg.aliases];
      const defaultValue =
        typeof arg.default === 'string'
          ? arg.default.replace('{', '${').replace(/[\r\n/]+/g, '')
          : arg.default;
      const requiredAnnotation = arg.required === true ? ` ${requiredArgAnnotation}` : '';
      const multiAnnotation = arg.multi === true ? ` ${multiArgAnnotation}` : '';

      let displayName = '';

      if (argName === '_') {
        displayName = unnamedArg;
      } else if (aliases && aliases.includes('_')) {
        displayName = unnamedArg;
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
        defaultBlock = `\n\nExample value for the ${displayName} argument, formatted as a \`base64\` data URL:	
[source, url]	
------------
${arg.default}
------------`;
      } else {
        defaultBlock =
          typeof defaultValue !== 'undefined' ? `\n\nDefault: \`${defaultValue}\`` : '';
      }

      return `|${displayName}${requiredAnnotation}${multiAnnotation}${aliasList}
|${types && types.length ? types.map(wrapInBackTicks).join(', ') : anyType}
|${arg.help ? addFunctionLinks(arg.help, { blacklist: argNames }) : ''}${defaultBlock}`;
    })
    .join('\n\n');
};

const getExamplesBlock = (examples: FunctionExample) => {
  const { syntax, usage } = examples;
  const { expression, help } = usage || {};
  const syntaxBlock = !syntax
    ? ''
    : `\n*Expression syntax*
[source,js]
----
${syntax}
----\n`;

  const codeBlock = !expression
    ? ''
    : `\n*Code example*
[source,text]
----
${expression}
----\n`;

  const codeHelp = !help ? '' : `${help}\n`;

  return `${syntaxBlock}${codeBlock}${codeHelp}`;
};

const copyDocs = () => {
  copy(createDocs());
  notifyService
    .getService()
    .success(
      `Please paste updated docs into '/kibana/docs/canvas/canvas-function-reference.asciidoc' and commit your changes.`,
      { title: 'Copied function docs to clipboard' }
    );
};

export const FunctionReferenceGenerator: FunctionComponent = () => (
  <EuiButtonEmpty color="danger" flush="left" size="xs" iconType="beaker" onClick={copyDocs}>
    Generate function ref docs
  </EuiButtonEmpty>
);
