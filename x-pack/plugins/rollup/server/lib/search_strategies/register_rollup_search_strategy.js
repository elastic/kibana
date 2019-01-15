/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import getRollupSearchStrategy from './rollup_search_strategy';
import getRollupSearchRequest from './rollup_search_request';

export default (server) => {
  const { addSearchStrategy, AbstractSearchRequest, AbstractSearchStrategy } = server.plugins.metrics;

  if (addSearchStrategy) {
    const RollupSearchRequest = getRollupSearchRequest(AbstractSearchRequest);
    const RollupSearchStrategy = getRollupSearchStrategy(AbstractSearchStrategy, RollupSearchRequest);

    addSearchStrategy(new RollupSearchStrategy(server));
  }

  return server;
};
