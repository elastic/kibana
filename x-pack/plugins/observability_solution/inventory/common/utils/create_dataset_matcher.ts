/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DatasetMatcher {
  excludeIfMatch: boolean;
  filter: (datasets: string[]) => string[];
  match: (dataset: string) => boolean;
}

function createMatcher(pattern: string, greedy: boolean) {
  if (!pattern) {
    return {
      match: (dataset: string) => greedy,
    };
  }
  const negate: boolean = pattern.startsWith('-');
  if (negate) {
    pattern = pattern.substring(1);
  }

  const regexStr = `^${pattern.replaceAll(/([\[\]\?\.\/\\\$\^])/g, '\\$1').replaceAll('*', '.*')}${
    greedy ? '' : '$'
  }`;

  const regex = new RegExp(regexStr);

  return {
    excludeIfMatch: negate,
    match: (dataset: string) => {
      const result = regex.test(dataset);
      return result !== negate;
    },
  };
}

export function createDatasetMatcher(pattern: string, greedy: boolean = true): DatasetMatcher {
  const [remotePattern, localPattern] = pattern.includes(':')
    ? pattern.split(':')
    : ['__local', pattern];

  const remoteMatcher = createMatcher(remotePattern, greedy && !localPattern);
  const localMatcher = createMatcher(localPattern, greedy);

  function matchDataset(dataset: string) {
    if (!pattern) {
      return true;
    }

    const [remote, local] = dataset.includes(':') ? dataset.split(':') : ['__local', dataset];

    return remoteMatcher.match(remote) && localMatcher.match(local);
  }

  return {
    excludeIfMatch: !!(remoteMatcher.excludeIfMatch || localMatcher.excludeIfMatch),
    filter: (datasets: string[]) => {
      return datasets.filter(matchDataset);
    },
    match: (dataset: string) => {
      return matchDataset(dataset);
    },
  };
}
