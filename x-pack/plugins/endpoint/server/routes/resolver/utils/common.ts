/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function splitN(str: string, separator: string, limit: number) {
  const tokens = str.split(separator);
  if (tokens.length > limit) {
    const splits = tokens.splice(0, limit);
    splits.push(tokens.join(separator));
    return splits;
  }
  return tokens;
}
