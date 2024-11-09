/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryResourceIdentifier } from './types';

const listRegex = /\b(?:lookup|inputlookup)\s+([\w-]+)\b/g; // Captures only the lookup table name
const macrosRegex = /`([\w-]+)(?:\([^`]*\))?`/g; // Captures only the macro name, ignoring arguments

export const splResourceIdentifier: QueryResourceIdentifier = (query) => {
  const macro = [];
  let macroMatch;
  while ((macroMatch = macrosRegex.exec(query)) !== null) {
    macro.push(macroMatch[1]);
  }

  const list = [];
  let listMatch;
  while ((listMatch = listRegex.exec(query)) !== null) {
    list.push(listMatch[1]);
  }

  return { macro, list };
};
