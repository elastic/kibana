/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import {
  NetworkKpiQueries,
  NetworkKpiTlsHandshakesStrategyResponse,
  NetworkKpiTlsHandshakesRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { buildTlsHandshakeQuery } from './query.network_kpi_tls_handshakes.dsl';
import { buildTlsHandshakeQueryEntities } from './query.network_kpi_tls_handshakes_entities.dsl';

export const networkKpiTlsHandshakes: SecuritySolutionFactory<NetworkKpiQueries.tlsHandshakes> = {
  buildDsl: (options: NetworkKpiTlsHandshakesRequestOptions) => buildTlsHandshakeQuery(options),
  parse: async (
    options: NetworkKpiTlsHandshakesRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkKpiTlsHandshakesStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildTlsHandshakeQuery(options))],
    };

    return {
      ...response,
      inspect,
      // @ts-expect-error code doesn't handle TotalHits
      tlsHandshakes: response.rawResponse.hits.total,
    };
  },
};

export const networkKpiTlsHandshakesEntities: SecuritySolutionFactory<NetworkKpiQueries.tlsHandshakes> =
  {
    buildDsl: (options: NetworkKpiTlsHandshakesRequestOptions) =>
      buildTlsHandshakeQueryEntities(options),
    parse: async (
      options: NetworkKpiTlsHandshakesRequestOptions,
      response: IEsSearchResponse<unknown>
    ): Promise<NetworkKpiTlsHandshakesStrategyResponse> => {
      const inspect = {
        dsl: [inspectStringifyObject(buildTlsHandshakeQueryEntities(options))],
      };

      return {
        ...response,
        inspect,
        // @ts-expect-error code doesn't handle TotalHits
        tlsHandshakes: response.rawResponse.aggregations?.tls?.value ?? null,
      };
    },
  };
