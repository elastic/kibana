/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchRequest } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';
import type {
  LogsEndpointAction,
  EndpointActionResponse,
  LogsEndpointActionResponse,
} from '../../../common/endpoint/types';
import { ACTIONS_SEARCH_PAGE_SIZE, ACTION_RESPONSE_INDICES } from '../services/actions/constants';
import { getDateFilters } from '../services/actions/utils';
import { catchAndWrapError } from './wrap_errors';
import type { GetActionDetailsListParam } from '../services/actions/action_list';

const queryOptions = Object.freeze({
  ignore: [404],
});

export const getActions = async ({
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  from,
  size,
  startDate,
  userIds,
  unExpiredOnly,
}: Omit<GetActionDetailsListParam, 'logger'>): Promise<{
  actionIds: string[];
  actionRequests: TransportResult<estypes.SearchResponse<LogsEndpointAction>, unknown>;
}> => {
  const additionalFilters = [];

  if (commands?.length) {
    additionalFilters.push({
      terms: {
        'data.command': commands,
      },
    });
  }

  if (elasticAgentIds?.length) {
    additionalFilters.push({ terms: { agents: elasticAgentIds } });
  }

  if (unExpiredOnly) {
    additionalFilters.push({ range: { expiration: { gte: 'now' } } });
  }

  const dateFilters = getDateFilters({ startDate, endDate });

  const actionsFilters = [
    { term: { input_type: 'endpoint' } },
    { term: { type: 'INPUT_ACTION' } },
    ...dateFilters,
    ...additionalFilters,
  ];

  const must: SearchRequest = [
    {
      bool: {
        filter: actionsFilters,
      },
    },
  ];

  if (userIds?.length) {
    const userIdsKql = userIds.map((userId) => `user_id:${userId}`).join(' or ');
    const mustClause = toElasticsearchQuery(fromKueryExpression(userIdsKql));
    must.push(mustClause);
  }

  const actionsSearchQuery: SearchRequest = {
    index: ENDPOINT_ACTIONS_INDEX,
    size,
    from,
    body: {
      query: {
        bool: { must },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
  };

  const actionRequests: TransportResult<
    estypes.SearchResponse<LogsEndpointAction>,
    unknown
  > = await esClient
    .search<LogsEndpointAction>(actionsSearchQuery, {
      ...queryOptions,
      meta: true,
    })
    .catch(catchAndWrapError);

  // only one type of actions
  const actionIds = actionRequests?.body?.hits?.hits.map((e) => {
    return (e._source as LogsEndpointAction).EndpointActions.action_id;
  });

  return { actionIds, actionRequests };
};

export const getActionResponses = async ({
  actionIds,
  elasticAgentIds,
  esClient,
}: {
  actionIds: string[];
  elasticAgentIds?: string[];
  esClient: ElasticsearchClient;
}): Promise<
  TransportResult<
    estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>,
    unknown
  >
> => {
  const filter = [];
  if (elasticAgentIds?.length) {
    filter.push({ terms: { agent_id: elasticAgentIds } });
  }
  if (actionIds.length) {
    filter.push({ terms: { action_id: actionIds } });
  }

  const responsesSearchQuery: SearchRequest = {
    index: ACTION_RESPONSE_INDICES,
    size: ACTIONS_SEARCH_PAGE_SIZE,
    from: 0,
    body: {
      query: {
        bool: {
          filter: filter.length ? filter : [],
        },
      },
    },
  };

  const actionResponses: TransportResult<
    estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>,
    unknown
  > = await esClient
    .search<EndpointActionResponse | LogsEndpointActionResponse>(responsesSearchQuery, {
      ...queryOptions,
      headers: {
        'X-elastic-product-origin': 'fleet',
      },
      meta: true,
    })
    .catch(catchAndWrapError);
  return actionResponses;
};
