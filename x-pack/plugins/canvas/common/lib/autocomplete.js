/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { parse } from './grammar';
import { getByAlias } from './get_by_alias';

const MARKER = 'CANVAS_SUGGESTION_MARKER';

/**
 * Generates the AST with the given expression and then returns the function and argument definitions
 * at the given position in the expression, if there are any.
 */
export function getFnArgDefAtPosition(specs, expression, position) {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text, { addMeta: true });
    const { ast: newAst, fnIndex, argName } = getFnArgAtPosition(ast, position);
    const fn = newAst.node.chain[fnIndex].node;

    const fnDef = getByAlias(specs, fn.function.replace(MARKER, ''));
    if (fnDef && argName) {
      const argDef = getByAlias(fnDef.args, argName);
      return { fnDef, argDef };
    }
    return { fnDef };
  } catch (e) {
    // Fail silently
  }
  return [];
}

/**
 * Gets a list of suggestions for the given expression at the given position. It does this by
 * inserting a marker at the given position, then parsing the resulting expression. This way we can
 * see what the marker would turn into, which tells us what sorts of things to suggest. For
 * example, if the marker turns into a function name, then we suggest functions. If it turns into
 * an unnamed argument, we suggest argument names. If it turns into a value, we suggest values.
 */
export function getAutocompleteSuggestions(specs, expression, position) {
  const text = expression.substr(0, position) + MARKER + expression.substr(position);
  try {
    const ast = parse(text, { addMeta: true });
    const { ast: newAst, fnIndex, argName, argIndex } = getFnArgAtPosition(ast, position);
    const fn = newAst.node.chain[fnIndex].node;

    if (fn.function.includes(MARKER)) return getFnNameSuggestions(specs, newAst, fnIndex);

    if (argName === '_') return getArgNameSuggestions(specs, newAst, fnIndex, argName, argIndex);

    if (argName) return getArgValueSuggestions(specs, newAst, fnIndex, argName, argIndex);
  } catch (e) {
    // Fail silently
  }
  return [];
}

/**
 * Get the function and argument (if there is one) at the given position.
 */
function getFnArgAtPosition(ast, position) {
  const fnIndex = ast.node.chain.findIndex(fn => fn.start <= position && position <= fn.end);
  const fn = ast.node.chain[fnIndex];
  for (const [argName, argValues] of Object.entries(fn.node.arguments)) {
    for (let argIndex = 0; argIndex < argValues.length; argIndex++) {
      const value = argValues[argIndex];
      if (value.start <= position && position <= value.end) {
        if (value.node !== null && value.node.type === 'expression')
          return getFnArgAtPosition(value, position);
        return { ast, fnIndex, argName, argIndex };
      }
    }
  }
  return { ast, fnIndex };
}

function getFnNameSuggestions(specs, ast, fnIndex) {
  // Filter the list of functions by the text at the marker
  const { start, end, node: fn } = ast.node.chain[fnIndex];
  const query = fn.function.replace(MARKER, '');
  const matchingFnDefs = specs.filter(({ name }) => textMatches(name, query));

  // Sort by whether or not the function expects the previous function's return type, then by
  // whether or not the function name starts with the text at the marker, then alphabetically
  const prevFn = ast.node.chain[fnIndex - 1];
  const prevFnDef = prevFn && getByAlias(specs, prevFn.node.function);
  const prevFnType = prevFnDef && prevFnDef.type;
  const comparator = combinedComparator(
    prevFnTypeComparator(prevFnType),
    invokeWithProp(startsWithComparator(query), 'name'),
    invokeWithProp(alphanumericalComparator, 'name')
  );
  const fnDefs = matchingFnDefs.sort(comparator);

  return fnDefs.map(fnDef => {
    return { type: 'function', text: fnDef.name + ' ', start, end: end - MARKER.length, fnDef };
  });
}

function getArgNameSuggestions(specs, ast, fnIndex, argName, argIndex) {
  // Get the list of args from the function definition
  const fn = ast.node.chain[fnIndex].node;
  const fnDef = getByAlias(specs, fn.function);
  if (!fnDef) return [];

  // We use the exact text instead of the value because it is always a string and might be quoted
  const { text, start, end } = fn.arguments[argName][argIndex];

  // Filter the list of args by the text at the marker
  const query = text.replace(MARKER, '');
  const matchingArgDefs = Object.values(fnDef.args).filter(({ name }) => textMatches(name, query));

  // Filter the list of args by those which aren't already present (unless they allow multi)
  const argEntries = Object.entries(fn.arguments).map(([name, values]) => {
    return [name, values.filter(value => !value.text.includes(MARKER))];
  });
  const unusedArgDefs = matchingArgDefs.filter(argDef => {
    if (argDef.multi) return true;
    return !argEntries.some(([name, values]) => {
      return values.length && (name === argDef.name || argDef.aliases.includes(name));
    });
  });

  // Sort by whether or not the arg is also the unnamed, then by whether or not the arg name starts
  // with the text at the marker, then alphabetically
  const comparator = combinedComparator(
    unnamedArgComparator,
    invokeWithProp(startsWithComparator(query), 'name'),
    invokeWithProp(alphanumericalComparator, 'name')
  );
  const argDefs = unusedArgDefs.sort(comparator);

  return argDefs.map(argDef => {
    return { type: 'argument', text: argDef.name + '=', start, end: end - MARKER.length, argDef };
  });
}

function getArgValueSuggestions(specs, ast, fnIndex, argName, argIndex) {
  // Get the list of values from the argument definition
  const fn = ast.node.chain[fnIndex].node;
  const fnDef = getByAlias(specs, fn.function);
  if (!fnDef) return [];
  const argDef = getByAlias(fnDef.args, argName);
  if (!argDef) return [];

  // Get suggestions from the argument definition, including the default
  const { start, end, node } = fn.arguments[argName][argIndex];
  const query = node.replace(MARKER, '');
  const suggestions = uniq(argDef.options.concat(argDef.default || []));

  // Filter the list of suggestions by the text at the marker
  const filtered = suggestions.filter(option => textMatches(String(option), query));

  // Sort by whether or not the value starts with the text at the marker, then alphabetically
  const comparator = combinedComparator(startsWithComparator(query), alphanumericalComparator);
  const sorted = filtered.sort(comparator);

  return sorted.map(value => {
    const text = maybeQuote(value) + ' ';
    return { start, end: end - MARKER.length, type: 'value', text };
  });
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

function prevFnTypeComparator(prevFnType) {
  return (a, b) =>
    Boolean(b.context.types && b.context.types.includes(prevFnType)) -
    Boolean(a.context.types && a.context.types.includes(prevFnType));
}

function unnamedArgComparator(a, b) {
  return b.aliases.includes('_') - a.aliases.includes('_');
}

function alphanumericalComparator(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function startsWithComparator(query) {
  return (a, b) => String(b).startsWith(query) - String(a).startsWith(query);
}

function combinedComparator(...comparators) {
  return (a, b) =>
    comparators.reduce((acc, comparator) => {
      if (acc !== 0) return acc;
      return comparator(a, b);
    }, 0);
}

function invokeWithProp(fn, prop) {
  return (...args) => fn(...args.map(arg => arg[prop]));
}
