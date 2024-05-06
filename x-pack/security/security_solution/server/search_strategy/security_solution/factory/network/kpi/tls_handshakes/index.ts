/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  NetworkKpiQueries,
  NetworkKpiTlsHandshakesStrategyResponse,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../../types';
import { buildTlsHandshakeQuery } from './query.network_kpi_tls_handshakes.dsl';

export const networkKpiTlsHandshakes: SecuritySolutionFactory<NetworkKpiQueries.tlsHandshakes> = {
  buildDsl: (options) => buildTlsHandshakeQuery(options),
  parse: async (
    options,
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
