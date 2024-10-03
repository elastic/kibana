/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const lookupRegex = /\b(?:lookup|inputlookup)\s+([^\s|]+)/g;
const macroRegex = /[\$`](\w+)[\$`]/g;

export const findMissingResources = (splSearch: string): string[] => {
  const missingResources: string[] = [];

  // lookups
  let lookupMatch;
  while ((lookupMatch = lookupRegex.exec(splSearch)) !== null) {
    missingResources.push(`lookup:${lookupMatch[1]}`);
  }

  // macros
  let macroMatch;
  while ((macroMatch = macroRegex.exec(splSearch)) !== null) {
    missingResources.push(`macro:${macroMatch[0]}`);
  }

  return missingResources;
};
