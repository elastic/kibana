/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SearchRequest } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { EndpointError } from '../../../common/endpoint/errors';
import type { SecuritySolutionRequestHandlerContext } from '../../types';
import type {
  EndpointAction,
  LogsEndpointAction,
  ActionListApiResponse,
  EndpointActionResponse,
  LogsEndpointActionResponse,
} from '../../../common/endpoint/types';
import {
  ACTIONS_SEARCH_PAGE_SIZE,
  ACTION_REQUEST_INDICES,
  ACTION_RESPONSE_INDICES,
} from '../services/actions/constants';
import { getDateFilters, logsEndpointActionsRegex } from '../services/actions/utils';
import { catchAndWrapError } from './wrap_errors';
import { doesLogsEndpointActionsIndexExist } from './yes_no_data_stream';
import { GetActionDetailsListParam } from '../services/actions/action_list';
import { ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';

const queryOptions = {
  headers: {
    'X-elastic-product-origin': 'fleet',
  },
  ignore: [404],
};

export const getTimeSortedActionDetails = (
  data: ActionListApiResponse['data']
): ActionListApiResponse['data'] => {
  return data.sort((a, b) => (new Date(b.startedAt) > new Date(a.startedAt) ? 1 : -1));
};

export const getActionsForAgents = async ({
  actionTypes,
  context,
  elasticAgentIds,
  endDate,
  from,
  logger,
  size,
  startDate,
  userIds,
}: GetActionDetailsListParam): Promise<{
  actionIds: string[];
  actionRequests: TransportResult<
    estypes.SearchResponse<EndpointAction | LogsEndpointAction>,
    unknown
  >;
}> => {
  const additionalFilters = [];
  if (actionTypes?.length) {
    additionalFilters.push({
      terms: {
        'data.command': actionTypes,
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

  const hasLogsEndpointActionsIndex = await doesLogsEndpointActionsIndexExist({
    context,
    logger,
    indexName: ENDPOINT_ACTIONS_INDEX,
  });
  const actionsSearchQuery: SearchRequest = {
    index: hasLogsEndpointActionsIndex ? ACTION_REQUEST_INDICES : AGENT_ACTIONS_RESULTS_INDEX,
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
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    actionRequests = await esClient
      .search<EndpointAction | LogsEndpointAction>(actionsSearchQuery, {
        ...queryOptions,
        meta: true,
      })
      .catch(catchAndWrapError);
    const actionIds = actionRequests?.body?.hits?.hits?.map((e) => {
      return logsEndpointActionsRegex.test(e._index)
        ? (e._source as LogsEndpointAction).EndpointActions.action_id
        : (e._source as EndpointAction).action_id;
    });

    return { actionIds, actionRequests };
  } catch (error) {
    throw new EndpointError(error.message, error);
  }
};

export const getActionResponses = async ({
  context,
  logger,
  elasticAgentIds,
  actionIds,
}: {
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
  elasticAgentIds?: string[];
  actionIds: string[];
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
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
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
