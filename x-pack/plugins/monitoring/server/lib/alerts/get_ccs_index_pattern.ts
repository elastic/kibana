/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export function getCcsIndexPattern(indexPattern: string, remotes: string[]): string {
  if (remotes.length === 0) {
    return indexPattern;
  }
  return `${indexPattern},${indexPattern
    .split(',')
    .map((pattern) => {
      return remotes.map((remoteName) => `${remoteName}:${pattern}`).join(',');
    })
    .join(',')}`;
}
