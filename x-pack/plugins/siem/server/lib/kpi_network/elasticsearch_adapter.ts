/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { KpiNetworkData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest, RequestBasicOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildDnsQuery } from './query_dns.dsl';
import { buildGeneralQuery } from './query_general.dsl';
import { buildTlsHandshakeQuery } from './query_tls_handshakes.dsl';
import { buildUniquePrvateIpQuery } from './query_unique_private_ips.dsl';
import { KpiNetworkAdapter, KpiNetworkESMSearchBody, KpiNetworkHit } from './types';

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
    const response = await this.framework.callWithRequest<KpiNetworkHit, TermAggregation>(
      request,
      'msearch',
      {
        body: [
          ...generalQuery,
          ...uniqueSourcePrivateIpsQuery,
          ...uniqueDestinationPrivateIpsQuery,
          ...dnsQuery,
          ...tlsHandshakesQuery,
        ],
      }
    );

    return {
      networkEvents: getOr(null, 'responses.0.hits.total.value', response),
      uniqueFlowId: getOr(null, 'responses.0.aggregations.unique_flow_id.value', response),
      activeAgents: getOr(null, 'responses.0.aggregations.active_agents.value', response),
      uniqueSourcePrivateIps: getOr(
        null,
        'responses.1.aggregations.unique_private_ips.value',
        response
      ),
      uniqueDestinationPrivateIps: getOr(
        null,
        'responses.2.aggregations.unique_private_ips.value',
        response
      ),
      dnsQueries: getOr(null, 'responses.3.hits.total.value', response),
      tlsHandshakes: getOr(null, 'responses.4.hits.total.value', response),
    };
  }
}
