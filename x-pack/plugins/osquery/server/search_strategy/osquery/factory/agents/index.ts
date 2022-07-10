/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../common/constants';
import type {
  AgentsStrategyResponse,
  AgentsRequestOptions,
  OsqueryQueries,
} from '../../../../../common/search_strategy/osquery';

import type { Agent } from '../../../../../common/shared_imports';
import { inspectStringifyObject } from '../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../types';
import { buildAgentsQuery } from './query.all_agents.dsl';

export const allAgents: OsqueryFactory<OsqueryQueries.agents> = {
  buildDsl: (options: AgentsRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }

    return buildAgentsQuery(options);
  },
  parse: async (
    options: AgentsRequestOptions,
    response: IEsSearchResponse<Agent>
  ): Promise<AgentsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildAgentsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits.map((hit) => ({
        _id: hit._id,
        ...hit._source,
      })) as Agent[],
    };
  },
};
