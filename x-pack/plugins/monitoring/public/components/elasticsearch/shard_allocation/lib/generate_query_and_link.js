/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function generateQueryAndLink(data) {
  let type = 'indices';
  let ident = data.name;
  if (data.type === 'node') {
    type = 'nodes';
    ident = data.id;
  }
  return '/elasticsearch/' + type + '/' + ident;
}
