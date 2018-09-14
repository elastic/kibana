/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { uniq } from 'lodash';
import { parse } from './grammar';
import { getByAlias } from './get_by_alias';

export function getFnAtPositionProvider(functionDefinitions) {
  return (expression, position) => {
    const marker = uuid();
    const text = expression.substr(0, position) + marker + expression.substr(position);
    try {
      const ast = parse(text);
      return getFnAtMarker(functionDefinitions, marker, ast);
    } catch (e) {
      return null;
    }
  };
}

function getFnAtMarker(functionDefinitions, marker, ast) {
  for (let i = 0; i < ast.chain.length; i++) {
    const fn = ast.chain[i];
    for (const [name, values] of Object.entries(fn.arguments)) {
      if (name.includes(marker)) return getByAlias(functionDefinitions, fn.function);
      for (const value of values) {
        if (typeof value === 'string' && value.includes(marker)) {
          const fnDef = getByAlias(functionDefinitions, fn.function);
          if (name === '_') return fnDef;
          return getByAlias(fnDef.args, name);
        }
        if (typeof value === 'object' && value.type === 'expression') {
          const fnAtMarker = getFnAtMarker(functionDefinitions, marker, value);
          if (typeof fnAtMarker !== 'undefined') return fnAtMarker;
        }
      }
    }
  }
}

export function getAutocompleteSuggestionsProvider(functionDefinitions) {
  return (expression, position) => {
    const marker = uuid();
    const text = expression.substr(0, position) + marker + expression.substr(position);
    try {
      const ast = parse(text);
      return getSuggestions(text, marker, ast);
    } catch (e) {
      return [];
    }
  };

  function getSuggestions(text, marker, expression) {
    for (let fnIndex = 0; fnIndex < expression.chain.length; fnIndex++) {
      const fn = expression.chain[fnIndex];

      // If we're at a function name, suggest function names
      if (fn.function.includes(marker))
        return getFnNameSuggestions(text, marker, expression, fnIndex);

      for (const [argName, argValues] of Object.entries(fn.arguments)) {
        // If we're at an argument name, suggest argument names
        // if (argName.includes(marker)) {
        //   return getArgNameSuggestions(text, marker, expression, fnIndex, argName);
        // }

        for (let argIndex = 0; argIndex < argValues.length; argIndex++) {
          const value = argValues[argIndex];

          // If we're at an unnamed argument value, suggest both function names AND values for the
          // unnamed argument
          if (argName === '_' && typeof value === 'string' && value.includes(marker)) {
            return [
              ...getArgNameSuggestions(text, marker, expression, fnIndex, value),
              ...getArgValueSuggestions(text, marker, expression, fnIndex, argName, argIndex),
            ];
          }

          // If we're at a named argument value, suggest values for that argument
          if (typeof value === 'string' && value.includes(marker))
            return getArgValueSuggestions(text, marker, expression, fnIndex, argName, argIndex);

          // If we're at an expression, and we recursively find suggestions for that expression,
          // just use those
          if (typeof value === 'object' && value.type === 'expression') {
            const suggestions = getSuggestions(text, marker, value);
            if (typeof suggestions !== 'undefined') return suggestions;
          }
        }
      }
    }
  }

  function getFnNameSuggestions(text, marker, expression, fnIndex) {
    // Filter the list of functions by the text at the marker
    const fn = expression.chain[fnIndex];
    const query = fn.function.replace(marker, '');
    const matchingFnDefs = functionDefinitions.filter(({ name }) => {
      return textMatches(name, query);
    });

    // Sort by whether or not the function expects the previous function's return type, then by
    // whether or not the function starts with the text at the marker, then alphabetically
    const prevFn = expression.chain[fnIndex - 1];
    const prevFnDef = prevFn && getByAlias(functionDefinitions, prevFn.function);
    const prevFnType = prevFnDef && prevFnDef.type;
    const fnDefs = matchingFnDefs.sort((a, b) => {
      const aMatches = Boolean(a.context.types && a.context.types.includes(prevFnType));
      const bMatches = Boolean(b.context.types && b.context.types.includes(prevFnType));
      if (aMatches !== bMatches) return bMatches - aMatches;

      const aStartsWith = a.name.startsWith(query);
      const bStartsWith = b.name.startsWith(query);
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    const start = text.indexOf(fn.function);
    const end = start + query.length;

    return fnDefs.map(fnDef => {
      return { start, end, type: 'function', text: fnDef.name + ' ', fnDef };
    });
  }

  function getArgNameSuggestions(text, marker, expression, fnIndex, argName) {
    // Get the list of args from the function definition
    const fn = expression.chain[fnIndex];
    const fnDef = getByAlias(functionDefinitions, fn.function);
    if (!fnDef) return [];

    // Filter the list of args by the text at the marker
    const query = argName.replace(marker, '');
    const matchingArgDefs = Object.values(fnDef.args).filter(({ name }) => {
      return textMatches(name, query);
    });

    // Filter the list of args by those which aren't already present (unless they allow multi)
    const argEntries = Object.entries(fn.arguments).map(([name, values]) => {
      return [name, values.filter(value => typeof value !== 'string' || !value.includes(marker))];
    });
    const unusedArgDefs = matchingArgDefs.filter(argDef => {
      if (argDef.multi) return true;
      return !argEntries.some(([name, values]) => {
        return values.length && (name === argDef.name || argDef.aliases.includes(name));
      });
    });

    // Sort by whether or not the arg is also the unnamed, then by whether or not the arg starts
    // with the text at the marker, then alphabetically
    const argDefs = unusedArgDefs.sort((a, b) => {
      if (a.aliases.includes('_')) return -1;
      if (b.aliases.includes('_')) return 1;

      const aStartsWith = a.name.startsWith(query);
      const bStartsWith = b.name.startsWith(query);
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    const start = text.indexOf(argName);
    const end = start + query.length;

    return argDefs.map(argDef => {
      return { start, end, type: 'argument', text: argDef.name + '=', argDef };
    });
  }

  function getArgValueSuggestions(text, marker, expression, fnIndex, argName, argIndex) {
    // Get the list of values from the argument definition
    const fn = expression.chain[fnIndex];
    const fnDef = getByAlias(functionDefinitions, fn.function);
    if (!fnDef) return [];
    const argDef = getByAlias(fnDef.args, argName);
    if (!argDef) return [];

    // If the arg is already used and isn't multi return an empty list
    const argEntries = Object.entries(fn.arguments).map(([name, values]) => {
      return [name, values.filter(value => typeof value !== 'string' || !value.includes(marker))];
    });
    if (!argDef.multi) {
      const isUsed = argEntries.some(([name, values]) => {
        return values.length && (name === argDef.name || argDef.aliases.includes(name));
      });
      if (isUsed) return [];
    }

    // Get suggestions from the argument definition, including the default
    const value = fn.arguments[argName][argIndex];
    const query = value.replace(marker, '');
    const suggestions = uniq(argDef.options.concat(argDef.default || []));

    // Filter the list of suggestions by the text at the marker
    const filtered = suggestions.filter(option => textMatches(String(option), query));

    // Sort by whether or not the value starts with the text at the marker, then alphabetically
    const sorted = filtered.sort((a, b) => {
      const aStartsWith = String(a).startsWith(query);
      const bStartsWith = String(b).startsWith(query);
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });

    const start = text.indexOf(value);
    const end = start + query.length;

    return sorted.map(value => {
      const text = maybeQuote(value) + ' ';
      return { start, end, type: 'value', text };
    });
  }
}

function textMatches(text, query) {
  return text.toLowerCase().includes(query.toLowerCase().trim());
}

function maybeQuote(value) {
  if (typeof value === 'string') {
    if (value.match(/^\{.*\}$/)) return value;
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}
