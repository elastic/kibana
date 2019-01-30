/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';

const esErrorsFactory = memoize((server) => {
  return server.plugins.elasticsearch.getCluster('admin').errors;
});

export function isEsErrorFactory(server) {
  const esErrors = esErrorsFactory(server);
  return function isEsError(err) {
    const keys = Object.keys(esErrors);
    for (let i = 0; i < keys.length; i++) {
      if (err instanceof esErrors[keys[i]]) {
        return true;
      }
    }
    return false;
  };
}
