/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const filterSuggestions = ({
  actionVariablesList,
  propertyPath,
}: {
  actionVariablesList?: string[];
  propertyPath: string;
}) => {
  if (!actionVariablesList) return [];
  const allSuggestions: string[] = [];
  actionVariablesList.forEach((suggestion: string) => {
    const splittedWords = suggestion.split('.');
    for (let i = 0; i < splittedWords.length; i++) {
      const currentSuggestion = splittedWords.slice(0, i + 1).join('.');
      if (!allSuggestions.includes(currentSuggestion)) {
        allSuggestions.push(currentSuggestion);
      }
    }
  });
  return allSuggestions.sort().filter((suggestion) => suggestion.startsWith(propertyPath));
};
