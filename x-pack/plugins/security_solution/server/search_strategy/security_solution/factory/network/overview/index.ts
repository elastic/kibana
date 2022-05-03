/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  NetworkQueries,
  NetworkOverviewStrategyResponse,
  NetworkOverviewRequestOptions,
  OverviewNetworkHit,
} from '../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildOverviewNetworkQuery } from './query.overview_network.dsl';

export const networkOverview: SecuritySolutionFactory<NetworkQueries.overview> = {
  buildDsl: (options: NetworkOverviewRequestOptions) => buildOverviewNetworkQuery(options),
  parse: async (
    options: NetworkOverviewRequestOptions,
    response: IEsSearchResponse<OverviewNetworkHit>
  ): Promise<NetworkOverviewStrategyResponse> => {
    // @ts-expect-error specify aggregations type explicitly
    const aggregations: OverviewNetworkHit = get('aggregations', response.rawResponse) || {};
    const inspect = {
      dsl: [inspectStringifyObject(buildOverviewNetworkQuery(options))],
    };

    return {
      ...response,
      inspect,
      overviewNetwork: {
        auditbeatSocket: getOr(null, 'unique_socket_count.doc_count', aggregations),
        filebeatCisco: getOr(
          null,
          'unique_filebeat_count.unique_cisco_count.doc_count',
          aggregations
        ),
        filebeatNetflow: getOr(
          null,
          'unique_filebeat_count.unique_netflow_count.doc_count',
          aggregations
        ),
        filebeatPanw: getOr(
          null,
          'unique_filebeat_count.unique_panw_count.doc_count',
          aggregations
        ),
        filebeatSuricata: getOr(null, 'unique_suricata_count.doc_count', aggregations),
        filebeatZeek: getOr(null, 'unique_zeek_count.doc_count', aggregations),
        packetbeatDNS: getOr(null, 'unique_dns_count.doc_count', aggregations),
        packetbeatFlow: getOr(null, 'unique_flow_count.doc_count', aggregations),
        packetbeatTLS: getOr(
          null,
          'unique_packetbeat_count.unique_tls_count.doc_count',
          aggregations
        ),
      },
    };
  },
};
