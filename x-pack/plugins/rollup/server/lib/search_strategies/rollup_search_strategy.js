/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { i18n } from '@kbn/i18n';
import RollupSearchRequest from './rollup_search_request';
import { callWithRequestFactory } from '../call_with_request_factory';
import { AbstractSearchStrategy } from '../../../../../../src/legacy/core_plugins/metrics/server/lib/search_strategies';

export default class RollupSearchStrategy extends AbstractSearchStrategy {
  name = 'rollup';
  batchRequestsSupport = false;
  label = i18n.translate('tsvb.searchStrategies.rollup.label', {
    defaultMessage: 'Rollup',
  });

  constructor(server) {
    super(server, callWithRequestFactory, RollupSearchRequest);
  }

  isViable(indexPattern) {
    return Boolean(indexPattern);
  }
}
