/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SearchRequest } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';

import { ENDPOINT_ACTIONS_DS, ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';
import { EndpointError } from '../../../common/endpoint/errors';
import type {
  EndpointAction,
  LogsEndpointAction,
  ActionListApiResponse,
  EndpointActionResponse,
  LogsEndpointActionResponse,
} from '../../../common/endpoint/types';
import { ACTIONS_SEARCH_PAGE_SIZE, ACTION_RESPONSE_INDICES } from '../services/actions/constants';
import { getDateFilters } from '../services/actions/utils';
import { catchAndWrapError } from './wrap_errors';
import { GetActionDetailsListParam } from '../services/actions/action_list';

const queryOptions = Object.freeze({
  headers: {
    'X-elastic-product-origin': 'fleet',
  },
  ignore: [404],
});

// This is same as the one for audit log
// but we want to deprecate audit log at some point
// thus creating this one for sorting action list log entries
export const getTimeSortedActionListLogEntries = (
  data: ActionListApiResponse['data'][number]['logEntries']
): ActionListApiResponse['data'][number]['logEntries'] => {
  return data.sort((a, b) =>
    new Date(b.item.data['@timestamp']) > new Date(a.item.data['@timestamp']) ? 1 : -1
  );
};

export const getActions = async ({
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  from,
  size,
  startDate,
  userIds,
}: Omit<GetActionDetailsListParam, 'logger'>): Promise<{
  actionIds: string[];
  actionRequests: TransportResult<
    estypes.SearchResponse<EndpointAction | LogsEndpointAction>,
    unknown
  >;
}> => {
  const additionalFilters = [];
  if (commands?.length) {
    additionalFilters.push({
      terms: {
        'data.command': commands,
      },
    });
  }
  if (userIds?.length) {
    additionalFilters.push({ terms: { user_id: userIds } });
  }
  if (elasticAgentIds?.length) {
    additionalFilters.push({ terms: { agents: elasticAgentIds } });
  }

  const dateFilters = getDateFilters({ startDate, endDate });
  const baseActionFilters = [
    { term: { input_type: 'endpoint' } },
    { term: { type: 'INPUT_ACTION' } },
  ];
  const actionsFilters = [...baseActionFilters, ...dateFilters];

  const actionsSearchQuery: SearchRequest = {
    index: ENDPOINT_ACTIONS_INDEX,
    size,
    from,
    body: {
      query: {
        bool: {
          filter: additionalFilters.length
            ? [...actionsFilters, ...additionalFilters]
            : actionsFilters,
        },
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

  let actionRequests: TransportResult<
    estypes.SearchResponse<EndpointAction | LogsEndpointAction>,
    unknown
  >;
  try {
    actionRequests = await esClient
      .search<EndpointAction | LogsEndpointAction>(actionsSearchQuery, {
        ...queryOptions,
        meta: true,
      })
      .catch(catchAndWrapError);

    const actionIds = actionRequests?.body?.hits?.hits?.map((e) => {
      return e._index.includes(ENDPOINT_ACTIONS_DS)
        ? (e._source as LogsEndpointAction).EndpointActions.action_id
        : (e._source as EndpointAction).action_id;
    });

    return { actionIds, actionRequests };
  } catch (error) {
    throw new EndpointError(error.message, error);
  }
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
  filter.push({ terms: { action_id: actionIds } });

  const responsesSearchQuery: SearchRequest = {
    index: ACTION_RESPONSE_INDICES,
    size: ACTIONS_SEARCH_PAGE_SIZE,
    from: 0,
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  };

  let actionResponses: TransportResult<
    estypes.SearchResponse<EndpointActionResponse | LogsEndpointActionResponse>,
    unknown
  >;
  try {
    actionResponses = await esClient
      .search<EndpointActionResponse | LogsEndpointActionResponse>(responsesSearchQuery, {
        ...queryOptions,
        meta: true,
      })
      .catch(catchAndWrapError);
    return actionResponses;
  } catch (error) {
    throw new EndpointError(error.message, error);
  }
};
