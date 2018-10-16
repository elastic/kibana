/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default async function fetchAliases(callWithRequest) {
  const params = {
    format: 'json'
  };
  const catAliases = await callWithRequest('cat.aliases', params);
  const aliases = {};
  for(let i = 0; i < catAliases.length; ++i) {
    if(aliases[catAliases[i].index] === undefined) {
      aliases[catAliases[i].index] = [catAliases[i].alias];
    }else{
      aliases[catAliases[i].index].push(catAliases[i].alias);
    }
  }

  return aliases;
}
