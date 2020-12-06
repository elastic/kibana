/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import {
  NetworkKpiQueries,
  NetworkKpiTlsHandshakesStrategyResponse,
  NetworkKpiTlsHandshakesRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { buildTlsHandshakeQuery } from './query.network_kpi_tls_handshakes.dsl';

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
      tlsHandshakes: response.rawResponse.hits.total,
    };
  },
};
