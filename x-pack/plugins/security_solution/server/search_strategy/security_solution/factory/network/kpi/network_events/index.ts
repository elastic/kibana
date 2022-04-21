/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import {
  NetworkKpiQueries,
  NetworkKpiNetworkEventsStrategyResponse,
  NetworkKpiNetworkEventsRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { buildNetworkEventsQuery } from './query.network_kpi_network_events.dsl';

export const networkKpiNetworkEvents: SecuritySolutionFactory<NetworkKpiQueries.networkEvents> = {
  buildDsl: (options: NetworkKpiNetworkEventsRequestOptions) => buildNetworkEventsQuery(options),
  parse: async (
    options: NetworkKpiNetworkEventsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkKpiNetworkEventsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildNetworkEventsQuery(options))],
    };

    return {
      ...response,
      inspect,
      // @ts-expect-error code doesn't handle TotalHits
      networkEvents: response.rawResponse.hits.total,
    };
  },
};
