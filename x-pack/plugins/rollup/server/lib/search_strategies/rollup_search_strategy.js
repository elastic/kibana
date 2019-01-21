/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { merge, get } from 'lodash';
import { callWithRequestFactory } from '../call_with_request_factory';

const ROLLUP_INDEX_CAPABILITIES_METHOD = 'rollup.rollupIndexCapabilities';
const INDEX_PATTERN_SEPARATOR = ',';
const batchRequestsSupport = false;

const getFieldsCapabilities = (rollupData) => {
  const rollupIndexKey =  Object.keys(rollupData)[0];

  return get(rollupData, `${rollupIndexKey}.rollup_jobs.[0].fields`);
};

export default (AbstractSearchStrategy, RollupSearchRequest, RollupSearchCapabilities) =>
  (class RollupSearchStrategy extends AbstractSearchStrategy {
    name = 'rollup';

    constructor(server) {
      super(server, callWithRequestFactory, RollupSearchRequest);
    }

    getRollupData(req, indexPattern) {
      const callWithRequest = this.getCallWithRequestInstance(req);
      const indices = (indexPattern || '').split(INDEX_PATTERN_SEPARATOR);
      const requests = indices.map(index => callWithRequest(ROLLUP_INDEX_CAPABILITIES_METHOD, {
        indexPattern: index,
      }));

      return Promise.all(requests)
        .then(data => (data || []).reduce((acc, rollupData) => merge(acc, rollupData), {}));
    }

    hasOneRollupIndex(rollupData) {
      return Object.keys(rollupData).length === 1;
    }

    async checkForViability(req, indexPattern) {
      const rollupData = await this.getRollupData(req, indexPattern);
      const isViable = this.hasOneRollupIndex(rollupData);
      let capabilities = null;

      if (isViable) {
        const fieldsCapabilities = getFieldsCapabilities(rollupData);

        capabilities = new RollupSearchCapabilities(req, batchRequestsSupport, fieldsCapabilities);
      }

      return {
        isViable,
        capabilities
      };
    }
  });
