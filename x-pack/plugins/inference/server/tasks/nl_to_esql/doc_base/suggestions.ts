/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Suggestion = (keywords: string[]) => string[] | undefined;

const suggestions: Suggestion[] = [
  (keywords) => {
    if (keywords.includes('STATS') && keywords.includes('DATE_TRUNC')) {
      return ['BUCKET'];
    }
  },
];

/**
 * Based on the list of keywords the model asked to get documentation for,
 * Try to provide suggestion on other commands or keywords that may be useful.
 *
 * E.g. when requesting documentation for `STATS` and `DATE_TRUNC`, suggests `BUCKET`
 *
 */
export const getSuggestions = (keywords: string[]): string[] => {
  return suggestions.reduce<string[]>((list, sugg) => {
    list.push(...(sugg(keywords) ?? []));
    return list;
  }, []);
};
