/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type {
  ActionResponsesRequestOptions,
  ActionResponsesRequestStrategyResponse,
  ResponseActionsQueries,
} from '../../../../../../common/search_strategy/security_solution/response_actions';

import { buildActionResultsQuery } from './query.action_results.dsl';
import type { SecuritySolutionFactory } from '../../types';

export const actionResults: SecuritySolutionFactory<ResponseActionsQueries.results> = {
  buildDsl: (options: ActionResponsesRequestOptions) => {
    return buildActionResultsQuery(options);
  },
  parse: async (options, response): Promise<ActionResponsesRequestStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildActionResultsQuery(options))],
    };

    // @ts-expect-error FIX THE TYPE
    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
