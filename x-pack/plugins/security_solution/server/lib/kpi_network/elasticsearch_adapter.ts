/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { inspectStringifyObject } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';

import { buildDnsQuery } from './query_dns.dsl';
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
import { buildNetworkEventsQuery } from './query_network_events';
import { buildUniqueFlowIdsQuery } from './query_unique_flow';

const formatHistogramData = (
  data: Array<{ key: number; count: { value: number } }>
): KpiNetworkHistogramData[] | null => {
  return data && data.length > 0
    ? data.map<KpiNetworkHistogramData>(({ key, count }) => {
        return {
          x: key,
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
    const networkEventsQuery: KpiNetworkESMSearchBody[] = buildNetworkEventsQuery(options);
    const uniqueFlowIdsQuery: KpiNetworkESMSearchBody[] = buildUniqueFlowIdsQuery(options);
    const uniquePrivateIpsQuery: KpiNetworkESMSearchBody[] = buildUniquePrvateIpQuery(options);
    const dnsQuery: KpiNetworkESMSearchBody[] = buildDnsQuery(options);
    const tlsHandshakesQuery: KpiNetworkESMSearchBody[] = buildTlsHandshakeQuery(options);
    const response = await this.framework.callWithRequest<
      KpiNetworkGeneralHit | KpiNetworkHit | KpiNetworkUniquePrivateIpsHit,
      TermAggregation
    >(request, 'msearch', {
      body: [
        ...networkEventsQuery,
        ...dnsQuery,
        ...uniquePrivateIpsQuery,
        ...uniqueFlowIdsQuery,
        ...tlsHandshakesQuery,
      ],
    });
    const uniqueSourcePrivateIpsHistogram = getOr(
      null,
      'responses.2.aggregations.source.histogram.buckets',
      response
    );
    const uniqueDestinationPrivateIpsHistogram = getOr(
      null,
      'responses.2.aggregations.destination.histogram.buckets',
      response
    );

    const inspect = {
      dsl: [
        inspectStringifyObject({ ...networkEventsQuery[0], body: networkEventsQuery[1] }),
        inspectStringifyObject({ ...dnsQuery[0], body: dnsQuery[1] }),
        inspectStringifyObject({ ...uniquePrivateIpsQuery[0], body: uniquePrivateIpsQuery[1] }),
        inspectStringifyObject({ ...uniqueFlowIdsQuery[0], body: uniqueFlowIdsQuery[1] }),
        inspectStringifyObject({ ...tlsHandshakesQuery[0], body: tlsHandshakesQuery[1] }),
      ],
      response: [
        inspectStringifyObject(response.responses[0]),
        inspectStringifyObject(response.responses[1]),
        inspectStringifyObject(response.responses[2]),
        inspectStringifyObject(response.responses[3]),
        inspectStringifyObject(response.responses[4]),
      ],
    };
    return {
      inspect,
      networkEvents: getOr(null, 'responses.0.hits.total.value', response),
      dnsQueries: getOr(null, 'responses.1.hits.total.value', response),
      uniqueSourcePrivateIps: getOr(
        null,
        'responses.2.aggregations.source.unique_private_ips.value',
        response
      ),
      uniqueSourcePrivateIpsHistogram: formatHistogramData(uniqueSourcePrivateIpsHistogram),
      uniqueDestinationPrivateIps: getOr(
        null,
        'responses.2.aggregations.destination.unique_private_ips.value',
        response
      ),
      uniqueDestinationPrivateIpsHistogram: formatHistogramData(
        uniqueDestinationPrivateIpsHistogram
      ),
      uniqueFlowId: getOr(null, 'responses.3.aggregations.unique_flow_id.value', response),
      tlsHandshakes: getOr(null, 'responses.4.hits.total.value', response),
    };
  }
}
