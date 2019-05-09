/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiHostsData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildAuthQuery } from './query_authentication.dsl';
import { buildGeneralQuery } from './query_general.dsl';
import {
  KpiHostsAdapter,
  KpiHostsESMSearchBody,
  KpiHostsGeneralHit,
  KpiHostsAuthHit,
} from './types';

export class ElasticsearchKpiHostsAdapter implements KpiHostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiHosts(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsData> {
    const generalQuery: KpiHostsESMSearchBody[] = buildGeneralQuery(options);
    const authQuery: KpiHostsESMSearchBody[] = buildAuthQuery(options);
    const response = await this.framework.callWithRequest<
      KpiHostsGeneralHit | KpiHostsAuthHit,
      TermAggregation
    >(request, 'msearch', {
      body: [...generalQuery, ...authQuery],
    });
    return {
      hosts: getOr(null, 'responses.0.aggregations.hosts.value', response),
      hostsHistogram: getOr(null, 'responses.0.aggregations.hosts_histogram.buckets', response),
      authSuccess: getOr(
        null,
        'responses.1.aggregations.authentication_success.doc_count',
        response
      ),
      authSuccessHistogram: getOr(
        null,
        'responses.1.aggregations.authentication_success_histogram.buckets',
        response
      ),
      authFailure: getOr(
        null,
        'responses.1.aggregations.authentication_failure.doc_count',
        response
      ),
      authFailureHistogram: getOr(
        null,
        'responses.1.aggregations.authentication_failure_histogram.buckets',
        response
      ),
      uniqueSourceIps: getOr(null, 'responses.0.aggregations.unique_source_ips.value', response),
      uniqueSourceIpsHistogram: getOr(
        null,
        'responses.0.aggregations.unique_source_ips_histogram.buckets',
        response
      ),
      uniqueDestinationIps: getOr(
        null,
        'responses.0.aggregations.unique_destination_ips.value',
        response
      ),
      uniqueDestinationIpsHistogram: getOr(
        null,
        'responses.0.aggregations.unique_destination_ips_histogram.buckets',
        response
      ),
    };
  }
}
