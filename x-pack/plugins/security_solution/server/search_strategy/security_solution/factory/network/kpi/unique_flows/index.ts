/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  NetworkKpiQueries,
  NetworkKpiUniqueFlowsStrategyResponse,
  NetworkKpiUniqueFlowsRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { buildUniqueFlowsQuery } from './query.network_kpi_unique_flows.dsl';

export const networkKpiUniqueFlows: SecuritySolutionFactory<NetworkKpiQueries.uniqueFlows> = {
  buildDsl: (options: NetworkKpiUniqueFlowsRequestOptions) => buildUniqueFlowsQuery(options),
  parse: async (
    options: NetworkKpiUniqueFlowsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkKpiUniqueFlowsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildUniqueFlowsQuery(options))],
    };

    return {
      ...response,
      inspect,
      uniqueFlowId: getOr(null, 'aggregations.unique_flow_id.value', response.rawResponse),
    };
  },
};
