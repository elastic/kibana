/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import RollupSearchStrategy from './rollup_search_strategy';

export default (server) => {
  const { addSearchStrategy } = server.plugins.metrics;

  if (addSearchStrategy) {
    addSearchStrategy(new RollupSearchStrategy(server));
  }

  return server;
};
