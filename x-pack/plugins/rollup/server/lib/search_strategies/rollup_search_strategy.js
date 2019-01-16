/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { callWithRequestFactory } from '../call_with_request_factory';

const ROLLUP_INDEX_CAPABILITIES_METHOD = 'rollup.rollupIndexCapabilities';
const INDEX_PATTERN_SEPARATOR = ',';

export default (AbstractSearchStrategy, RollupSearchRequest) =>
  (class RollupSearchStrategy extends AbstractSearchStrategy {
    name = 'rollup';
    batchRequestsSupport = false;

    constructor(server) {
      super(server, callWithRequestFactory, RollupSearchRequest);
    }

    async numberOfRollupJobs(req, indexPattern) {
      const callWithRequest = this.getCallWithRequestInstance(req);
      const indices = (indexPattern || '').split(INDEX_PATTERN_SEPARATOR);

      const requests = indices.map(index => callWithRequest(ROLLUP_INDEX_CAPABILITIES_METHOD, {
        indexPattern: index,
      }));

      return Promise.all(requests)
        .then((responses) => responses
          .reduce((numberOfRollupJobs, response, index) => {
            if (response[indices[index]]) {
              numberOfRollupJobs += 1;
            }

            return numberOfRollupJobs;
          }, 0))
        .catch(() => Promise.resolve(0));
    }

    async hasOneRollupJob(req, indexPattern) {
      return await this.numberOfRollupJobs(req, indexPattern) === 1;
    }

    async isViable(req, indexPattern) {
      return await this.hasOneRollupJob(req, indexPattern);
    }
  });
