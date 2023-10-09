/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { inspectStringifyObject } from '@kbn/osquery-plugin/common/utils/build_query';
import { buildResponseActionsQuery } from './query.all_actions.dsl';
import type { EndpointFactory } from '../../types';
import type {
  ActionRequestOptions,
  ActionRequestStrategyResponse,
  ResponseActionsQueries,
} from '../../../../../../common/search_strategy/endpoint/response_actions';

export const allActions: EndpointFactory<ResponseActionsQueries.actions> = {
  buildDsl: (options: ActionRequestOptions, { authz }) => buildResponseActionsQuery(options, authz),
  parse: async (
    options: ActionRequestOptions,
    response: IEsSearchResponse,
    deps
  ): Promise<ActionRequestStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildResponseActionsQuery(options, deps.authz))],
    };

    return {
      ...response,
      inspect,
      edges: response.rawResponse.hits.hits,
    };
  },
};
