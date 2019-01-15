/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import RollupSearchRequest from './rollup_search_request';
import { callWithRequestFactory } from '../call_with_request_factory';
import { AbstractSearchStrategy } from '../../../../../../src/legacy/core_plugins/metrics/server/lib/search_strategies';

export default class RollupSearchStrategy extends AbstractSearchStrategy {
  name = 'rollup';
  batchRequestsSupport = false;

  constructor(server) {
    super(server, callWithRequestFactory, RollupSearchRequest);
  }

  isViable(req, indexPattern) {
    const MULTI_INDEX_SEPARATOR = ',';
    const splittedIndex = (indexPattern || '').split(MULTI_INDEX_SEPARATOR);

    return Boolean(splittedIndex);
  }
}
