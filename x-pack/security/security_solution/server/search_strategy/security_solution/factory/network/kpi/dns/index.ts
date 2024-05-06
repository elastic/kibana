/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  NetworkKpiQueries,
  NetworkKpiDnsStrategyResponse,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../../types';
import { buildDnsQuery } from './query.network_kpi_dns.dsl';

export const networkKpiDns: SecuritySolutionFactory<NetworkKpiQueries.dns> = {
  buildDsl: (options) => buildDnsQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkKpiDnsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildDnsQuery(options))],
    };

    return {
      ...response,
      inspect,
      // @ts-expect-error code doesn't handle TotalHits
      dnsQueries: response.rawResponse.hits.total,
    };
  },
};
