/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const sortWithExcludesAtEnd = (indices: string[]) => {
  const allSorted = indices.reduce(
    (acc: { includes: string[]; excludes: string[] }, index) => {
      if (index.trim().startsWith('-')) {
        acc.excludes.push(index);
      } else {
        acc.includes.push(index);
      }
      return acc;
    },
    { includes: [], excludes: [] }
  );
  return [...allSorted.includes.sort(), ...allSorted.excludes.sort()];
};

export const ensurePatternFormat = (patternList: string[]): string[] =>
  sortWithExcludesAtEnd([
    ...new Set(
      patternList.reduce((acc: string[], pattern: string) => {
        acc.unshift(...pattern.split(','));
        return acc;
      }, [])
    ),
  ]);
