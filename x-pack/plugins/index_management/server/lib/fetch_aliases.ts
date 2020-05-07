/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function fetchAliases(callWithRequest: any) {
  const results = await callWithRequest('cat.aliases', { format: 'json' });
  return results.reduce(
    (hash: { [key: string]: any }, { index, alias }: { index: string; alias: string }) => {
      (hash[index] = hash[index] || []).push(alias);
      return hash;
    },
    {}
  );
}
