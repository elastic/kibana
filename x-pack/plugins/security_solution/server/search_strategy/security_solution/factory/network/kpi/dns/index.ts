/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import {
  NetworkKpiQueries,
  NetworkKpiDnsStrategyResponse,
  NetworkKpiDnsRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { buildDnsQuery } from './query.network_kpi_dns.dsl';

export const networkKpiDns: SecuritySolutionFactory<NetworkKpiQueries.dns> = {
  buildDsl: (options: NetworkKpiDnsRequestOptions) => buildDnsQuery(options),
  parse: async (
    options: NetworkKpiDnsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkKpiDnsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildDnsQuery(options))],
    };

    return {
      ...response,
      inspect,
      dnsQueries: response.rawResponse.hits.total,
    };
  },
};
