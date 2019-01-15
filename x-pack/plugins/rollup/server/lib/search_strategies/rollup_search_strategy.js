/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import RollupSearchRequest from './rollup_search_request';
import { callWithRequestFactory } from '../call_with_request_factory';
import { AbstractSearchStrategy } from '../../../../../../src/legacy/core_plugins/metrics/server/lib/search_strategies';

const ROLLUP_INDEX_CAPABILITIES_METHOD = 'rollup.rollupIndexCapabilities';
const INDEX_PATTERN_SEPARATOR = ',';

export default class RollupSearchStrategy extends AbstractSearchStrategy {
  name = 'rollup';
  batchRequestsSupport = false;

  constructor(server) {
    super(server, callWithRequestFactory, RollupSearchRequest);
  }

  async isRollupJobExists(req, indexPattern) {
    const callWithRequest = this.getCallWithRequestInstance(req);
    const indices = (indexPattern || '').split(INDEX_PATTERN_SEPARATOR);

    const requests = indices.map(index => callWithRequest(ROLLUP_INDEX_CAPABILITIES_METHOD, {
      indexPattern: index,
    }));

    return Promise.all(requests)
      .then((responses) => responses.some((response, index) => Boolean(response[indices[index]])))
      .catch(() => Promise.resolve(false));
  }

  async isViable(req, indexPattern) {
    return await await this.isRollupJobExists(req, indexPattern);
  }
}
