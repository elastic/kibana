/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { inspectStringifyObject } from '../../../../../utils/build_query';

import { buildResponseActionsQuery } from './query.all_actions.dsl';
import type { SecuritySolutionFactory } from '../../types';
import type {
  ActionRequestOptions,
  ActionRequestStrategyResponse,
  ResponseActionsQueries,
} from '../../../../../../common/search_strategy/security_solution/response_actions';

export const allActions: SecuritySolutionFactory<ResponseActionsQueries.actions> = {
  buildDsl: (options: ActionRequestOptions) => {
    return buildResponseActionsQuery(options);
  },
  parse: async (
    options: ActionRequestOptions,
    response: IEsSearchResponse
  ): Promise<ActionRequestStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildResponseActionsQuery(options))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
