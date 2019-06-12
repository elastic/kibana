/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';

import { buildDnsQuery } from './query_dns.dsl';
import { buildGeneralQuery } from './query_general.dsl';
import { buildTlsHandshakeQuery } from './query_tls_handshakes.dsl';
import { buildUniquePrvateIpQuery } from './query_unique_private_ips.dsl';
import {
  KpiNetworkHit,
  KpiNetworkAdapter,
  KpiNetworkESMSearchBody,
  KpiNetworkGeneralHit,
  KpiNetworkUniquePrivateIpsHit,
} from './types';
import { TermAggregation } from '../types';
import { KpiNetworkHistogramData, KpiNetworkData } from '../../graphql/types';

const formatHistogramData = (
  data: Array<{ key_as_string: string; count: { value: number } }>
): KpiNetworkHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiNetworkHistogramData>(({ key_as_string, count }) => {
        return {
          x: key_as_string,
          y: getOr(null, 'value', count),
        };
      })
    : null;
};

export class ElasticsearchKpiNetworkAdapter implements KpiNetworkAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getKpiNetwork(
    request: FrameworkRequest,
    options: RequestBasicOptions
  ): Promise<KpiNetworkData> {
    const generalQuery: KpiNetworkESMSearchBody[] = buildGeneralQuery(options);
    const uniqueSourcePrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(
      'source',
      options
    );
    const uniqueDestinationPrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(
      'destination',
      options
    );
    const dnsQuery: KpiNetworkESMSearchBody[] = buildDnsQuery(options);
    const tlsHandshakesQuery: KpiNetworkESMSearchBody[] = buildTlsHandshakeQuery(options);
    const response = await this.framework.callWithRequest<
      KpiNetworkGeneralHit | KpiNetworkHit | KpiNetworkUniquePrivateIpsHit,
      TermAggregation
    >(request, 'msearch', {
      body: [
        ...generalQuery,
        ...uniqueSourcePrivateIpsQuery,
        ...uniqueDestinationPrivateIpsQuery,
        ...dnsQuery,
        ...tlsHandshakesQuery,
      ],
    });
    const uniqueSourcePrivateIpsHistogram = getOr(
      null,
      'responses.1.aggregations.histogram.buckets',
      response
    );
    const uniqueDestinationPrivateIpsHistogram = getOr(
      null,
      'responses.2.aggregations.histogram.buckets',
      response
    );

    return {
      networkEvents: getOr(null, 'responses.0.hits.total.value', response),
      uniqueFlowId: getOr(null, 'responses.0.aggregations.unique_flow_id.value', response),
      uniqueSourcePrivateIps: getOr(
        null,
        'responses.1.aggregations.unique_private_ips.value',
        response
      ),
      uniqueSourcePrivateIpsHistogram: formatHistogramData(uniqueSourcePrivateIpsHistogram),
      uniqueDestinationPrivateIps: getOr(
        null,
        'responses.2.aggregations.unique_private_ips.value',
        response
      ),
      uniqueDestinationPrivateIpsHistogram: formatHistogramData(
        uniqueDestinationPrivateIpsHistogram
      ),
      dnsQueries: getOr(null, 'responses.3.hits.total.value', response),
      tlsHandshakes: getOr(null, 'responses.4.hits.total.value', response),
    };
  }
}
