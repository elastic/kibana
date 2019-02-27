/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
const SEARCH_METHOD = 'rollup.search';

export const getRollupSearchRequest = (AbstractSearchRequest) =>
  (class RollupSearchRequest extends AbstractSearchRequest {
    async search(options) {
      const bodies = Array.isArray(options.body) ? options.body : [options.body];
      const requests = bodies
        .map(body => this.callWithRequest(SEARCH_METHOD, {
          body,
          index: this.indexPattern,
          rest_total_hits_as_int: true,
        }));

      return await Promise.all(requests);
    }
  });
