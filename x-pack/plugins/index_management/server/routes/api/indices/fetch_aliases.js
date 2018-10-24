/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export async function fetchAliases(callWithRequest) {
  const catAliases = await callWithRequest('cat.aliases', { format: 'json' });
  return catAliases.reduce((hash, val) => {
    (hash[val.index] = hash[val.index] || []).push(val.alias);
    return hash;
  }, {});
}
