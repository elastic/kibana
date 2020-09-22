/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';
import { buildHostsQuery } from './query_hosts.dsl';
import { buildAuthQuery } from './query_authentication.dsl';
import { buildUniqueIpsQuery } from './query_unique_ips.dsl';
import {
  KpiHostsAdapter,
  KpiHostsESMSearchBody,
  KpiHostsAuthHit,
  KpiHostHistogram,
  KpiHostGeneralHistogramCount,
  KpiHostAuthHistogramCount,
  KpiHostsUniqueIpsHit,
  KpiHostsHostsHit,
} from './types';
import { KpiHostHistogramData, KpiHostsData, KpiHostDetailsData } from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';

const formatGeneralHistogramData = (
  data: Array<KpiHostHistogram<KpiHostGeneralHistogramCount>>
): KpiHostHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiHostHistogramData>(({ key, count }) => ({
        x: key,
        y: count.value,
      }))
    : null;
};

const formatAuthHistogramData = (
  data: Array<KpiHostHistogram<KpiHostAuthHistogramCount>>
): KpiHostHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiHostHistogramData>(({ key, count }) => ({
        x: key,
        y: count.doc_count,
      }))
    : null;
};

export class ElasticsearchKpiHostsAdapter implements KpiHostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiHosts(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostsData> {
    const hostsQuery: KpiHostsESMSearchBody[] = buildHostsQuery(options);
    const uniqueIpsQuery: KpiHostsESMSearchBody[] = buildUniqueIpsQuery(options);
    const authQuery: KpiHostsESMSearchBody[] = buildAuthQuery(options);
    const response = await this.framework.callWithRequest<
      KpiHostsHostsHit | KpiHostsUniqueIpsHit | KpiHostsAuthHit,
      TermAggregation
    >(request, 'msearch', {
      body: [...hostsQuery, ...authQuery, ...uniqueIpsQuery],
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
      'responses.2.aggregations.unique_source_ips_histogram.buckets',
      response
    );
    const uniqueDestinationIpsHistogram = getOr(
      null,
      'responses.2.aggregations.unique_destination_ips_histogram.buckets',
      response
    );

    const inspect = {
      dsl: [
        inspectStringifyObject({ ...hostsQuery[0], body: hostsQuery[1] }),
        inspectStringifyObject({
          ...authQuery[0],
          body: authQuery[1],
        }),
        inspectStringifyObject({
          ...uniqueIpsQuery[0],
          body: uniqueIpsQuery[1],
        }),
      ],
      response: [
        inspectStringifyObject(response.responses[0]),
        inspectStringifyObject(response.responses[1]),
        inspectStringifyObject(response.responses[2]),
      ],
    };
    return {
      inspect,
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
      uniqueSourceIps: getOr(null, 'responses.2.aggregations.unique_source_ips.value', response),
      uniqueSourceIpsHistogram: formatGeneralHistogramData(uniqueSourceIpsHistogram),
      uniqueDestinationIps: getOr(
        null,
        'responses.2.aggregations.unique_destination_ips.value',
        response
      ),
      uniqueDestinationIpsHistogram: formatGeneralHistogramData(uniqueDestinationIpsHistogram),
    };
  }

  public async getKpiHostDetails(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiHostDetailsData> {
    const uniqueIpsQuery: KpiHostsESMSearchBody[] = buildUniqueIpsQuery(options);
    const authQuery: KpiHostsESMSearchBody[] = buildAuthQuery(options);
    const response = await this.framework.callWithRequest<
      KpiHostsUniqueIpsHit | KpiHostsAuthHit,
      TermAggregation
    >(request, 'msearch', {
      body: [...authQuery, ...uniqueIpsQuery],
    });

    const authSuccessHistogram = getOr(
      null,
      'responses.0.aggregations.authentication_success_histogram.buckets',
      response
    );
    const authFailureHistogram = getOr(
      null,
      'responses.0.aggregations.authentication_failure_histogram.buckets',
      response
    );
    const uniqueSourceIpsHistogram = getOr(
      null,
      'responses.1.aggregations.unique_source_ips_histogram.buckets',
      response
    );
    const uniqueDestinationIpsHistogram = getOr(
      null,
      'responses.1.aggregations.unique_destination_ips_histogram.buckets',
      response
    );
    const inspect = {
      dsl: [
        inspectStringifyObject({ ...authQuery[0], body: authQuery[1] }),
        inspectStringifyObject({ ...uniqueIpsQuery[0], body: uniqueIpsQuery[1] }),
      ],
      response: [
        inspectStringifyObject(response.responses[0]),
        inspectStringifyObject(response.responses[1]),
      ],
    };

    return {
      inspect,
      authSuccess: getOr(
        null,
        'responses.0.aggregations.authentication_success.doc_count',
        response
      ),
      authSuccessHistogram: formatAuthHistogramData(authSuccessHistogram),
      authFailure: getOr(
        null,
        'responses.0.aggregations.authentication_failure.doc_count',
        response
      ),
      authFailureHistogram: formatAuthHistogramData(authFailureHistogram),
      uniqueSourceIps: getOr(null, 'responses.1.aggregations.unique_source_ips.value', response),
      uniqueSourceIpsHistogram: formatGeneralHistogramData(uniqueSourceIpsHistogram),
      uniqueDestinationIps: getOr(
        null,
        'responses.1.aggregations.unique_destination_ips.value',
        response
      ),
      uniqueDestinationIpsHistogram: formatGeneralHistogramData(uniqueDestinationIpsHistogram),
    };
  }
}
