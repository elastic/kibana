/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function parseIndex(index: string) {
  if (!index.includes(':')) {
    return { remote: null, index };
  }

  const split = index.split(':');
  return { remote: split[0], index: split[1] };
}

function createPatternMatcher(pattern: string) {
  return (target: string): boolean => {
    if (!pattern.length) {
      return false;
    }

    const parts = pattern.split('*');
    let currentIndex = 0;

    for (const part of parts) {
      if (part === '') continue; // Skip empty parts from leading or trailing '*'
      const index = target.indexOf(part, currentIndex);
      if (index === -1) return false;
      currentIndex = index + part.length;
    }

    return true;
  };
}

export function createIndexPatternMatcher(indices: string[]) {
  const indicesWithRemote = indices.map(parseIndex);

  const all = new Set(indices);
  return {
    all,
    matches: (indexPattern: string) => {
      const allPatterns = indexPattern.split(',');

      return allPatterns.some((pattern) => {
        const parsed = parseIndex(pattern);
        const remoteMatcher = createPatternMatcher(parsed.remote ?? '');
        const indexMatcher = createPatternMatcher(parsed.index);

        return indicesWithRemote.some((index) => {
          const matchesRemote =
            (!index.remote && !parsed.remote) || (index.remote && remoteMatcher(index.remote));

          const matchesIndex = indexMatcher(index.index);

          return matchesRemote && matchesIndex;
        });
      });
    },
  };
}
