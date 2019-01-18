/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { merge } from 'lodash';
import { callWithRequestFactory } from '../call_with_request_factory';

const ROLLUP_INDEX_CAPABILITIES_METHOD = 'rollup.rollupIndexCapabilities';
const INDEX_PATTERN_SEPARATOR = ',';
const batchRequestsSupport = false;

export default (AbstractSearchStrategy, RollupSearchRequest, RollupSearchCapabilities) =>
  (class RollupSearchStrategy extends AbstractSearchStrategy {
    name = 'rollup';

    constructor(server) {
      super(server, callWithRequestFactory, RollupSearchRequest);
    }

    getAllRollupCapabilities(req, indexPattern) {
      const callWithRequest = this.getCallWithRequestInstance(req);
      const indices = (indexPattern || '').split(INDEX_PATTERN_SEPARATOR);
      const requests = indices.map(index => callWithRequest(ROLLUP_INDEX_CAPABILITIES_METHOD, {
        indexPattern: index,
      }));

      return Promise.all(requests)
        .then(data => (data || []).reduce((acc, rollupData) => merge(acc, rollupData), {}));
    }

    hasOneRollupJob(rollupCapabilities) {
      return Object.keys(rollupCapabilities).length === 1;
    }

    async checkForViability(req, indexPattern) {
      const rollupCapabilities = await this.getAllRollupCapabilities(req, indexPattern);

      const isViable = this.hasOneRollupJob(rollupCapabilities);

      return {
        isViable,
        capabilities: isViable ? new RollupSearchCapabilities(req, batchRequestsSupport, rollupCapabilities) : null,
      };
    }
  });
