/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Important:
 * This library uses regular expressions that are executed against arbitrary user input, they need to be safe from ReDoS attacks.
 * Please make sure to test them before using them in production.
 * At the time of writing, this tool can be used to test it: https://devina.io/redos-checker
 */

import type { QueryResourceIdentifier } from './types';

const listRegex = /\b(?:lookup|inputlookup)\s+([\w-]+)\b/g; // Captures only the lookup table name
const macrosRegex = /`([\w-]+)(?:\(([^`]*?)\))?`/g; // Captures only the macro name and arguments

const commentRegex = /```.*```/g;
const doubleQuoteStrRegex = /".*"/g;
const singleQuoteStrRegex = /'.*'/g;

export const splResourceIdentifier: QueryResourceIdentifier = (query) => {
  // sanitize the query to avoid mismatching macro and list names inside comments or literal strings
  const sanitizedQuery = query
    .replaceAll(commentRegex, '')
    .replaceAll(doubleQuoteStrRegex, '"literal"')
    .replaceAll(singleQuoteStrRegex, "'literal'");

  const macro = [];
  let macroMatch;
  while ((macroMatch = macrosRegex.exec(sanitizedQuery)) !== null) {
    const macroName = macroMatch[1];
    const args = macroMatch[2]; // This captures the content inside the parentheses
    const argCount = args ? args.split(',').length : 0; // Count arguments if present
    const macroWithArgs = argCount > 0 ? `${macroName}(${argCount})` : macroName;
    macro.push(macroWithArgs);
  }

  const list = [];
  let listMatch;
  while ((listMatch = listRegex.exec(sanitizedQuery)) !== null) {
    list.push(listMatch[1]);
  }

  return { macro, list };
};
