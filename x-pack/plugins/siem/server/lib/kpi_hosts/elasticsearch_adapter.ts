/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildAuthQuery } from './query_authentication.dsl';
import { buildGeneralQuery } from './query_general.dsl';
import {
  KpiHostsAdapter,
  KpiHostsESMSearchBody,
  KpiHostsGeneralHit,
  KpiHostsAuthHit,
  KpiHostsMappedData,
  KpiHostHistogram,
  KpiHostGeneralHistogramCount,
  KpiHostAuthHistogramCount,
} from './types';
import { KpiHostHistogramData } from '../../graphql/types';

const formatGeneralHistogramData = (
  data: Array<KpiHostHistogram<KpiHostGeneralHistogramCount>>
): KpiHostHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiHostHistogramData>(({ key_as_string, count }) => ({
        x: key_as_string,
        y: count.value,
      }))
    : null;
};

const formatAuthHistogramData = (
  data: Array<KpiHostHistogram<KpiHostAuthHistogramCount>>
): KpiHostHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiHostHistogramData>(({ key_as_string, count }) => ({
        x: key_as_string,
        y: count.doc_count,
      }))
    : null;
};

export class ElasticsearchKpiHostsAdapter implements KpiHostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiHosts(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsMappedData> {
    const generalQuery: KpiHostsESMSearchBody[] = buildGeneralQuery(options);
    const authQuery: KpiHostsESMSearchBody[] = buildAuthQuery(options);
    const response = await this.framework.callWithRequest<
      KpiHostsGeneralHit | KpiHostsAuthHit,
      TermAggregation
    >(request, 'msearch', {
      body: [...generalQuery, ...authQuery],
    });

    const hostsHistogram = getOr(
      null,
      'responses.0.aggregations.hosts_histogram.buckets',
      response
    );
    const authSuccessHistogram = getOr(
      null,
      'responses.1.aggregations.authentication_success_histogram.buckets',
      response
    );
    const authFailureHistogram = getOr(
      null,
      'responses.1.aggregations.authentication_failure_histogram.buckets',
      response
    );
    const uniqueSourceIpsHistogram = getOr(
      null,
      'responses.0.aggregations.unique_source_ips_histogram.buckets',
      response
    );
    const uniqueDestinationIpsHistogram = getOr(
      null,
      'responses.0.aggregations.unique_destination_ips_histogram.buckets',
      response
    );
    return {
      hosts: getOr(null, 'responses.0.aggregations.hosts.value', response),
      hostsHistogram: formatGeneralHistogramData(hostsHistogram),
      authSuccess: getOr(
        null,
        'responses.1.aggregations.authentication_success.doc_count',
        response
      ),
      authSuccessHistogram: formatAuthHistogramData(authSuccessHistogram),
      authFailure: getOr(
        null,
        'responses.1.aggregations.authentication_failure.doc_count',
        response
      ),
      authFailureHistogram: formatAuthHistogramData(authFailureHistogram),
      uniqueSourceIps: getOr(null, 'responses.0.aggregations.unique_source_ips.value', response),
      uniqueSourceIpsHistogram: formatGeneralHistogramData(uniqueSourceIpsHistogram),
      uniqueDestinationIps: getOr(
        null,
        'responses.0.aggregations.unique_destination_ips.value',
        response
      ),
      uniqueDestinationIpsHistogram: formatGeneralHistogramData(uniqueDestinationIpsHistogram),
    };
  }
}
