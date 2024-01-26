/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@kbn/data-plugin/public';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';
import type { LogsEndpointAction } from '../../../common/endpoint/types';
import { getDateFilters } from '../services/actions/utils';
import { catchAndWrapError } from './wrap_errors';
import type { GetActionDetailsListParam } from '../services/actions/action_list';

const queryOptions = Object.freeze({
  ignore: [404],
});

const getActionTypeFilter = (actionType: string): SearchRequest => {
  return actionType === 'manual'
    ? {
        must_not: {
          exists: {
            field: 'data.alert_id',
          },
        },
      }
    : actionType === 'automated'
    ? {
        filter: {
          exists: {
            field: 'data.alert_id',
          },
        },
      }
    : {};
};
export const getActions = async ({
  agentTypes,
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  from,
  size,
  startDate,
  userIds,
  unExpiredOnly,
  types,
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

  if (agentTypes?.length) {
    additionalFilters.push({ terms: { input_type: agentTypes } });
  }

  if (elasticAgentIds?.length) {
    additionalFilters.push({ terms: { agents: elasticAgentIds } });
  }

  if (unExpiredOnly) {
    additionalFilters.push({ range: { expiration: { gte: 'now' } } });
  }

  const dateFilters = getDateFilters({ startDate, endDate });

  const actionsFilters = [...dateFilters, ...additionalFilters];

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

  const isNotASingleActionType = !types || (types && types.length > 1);

  const actionsSearchQuery: SearchRequest = {
    index: ENDPOINT_ACTIONS_INDEX,
    size,
    from,
    body: {
      query: {
        bool: {
          must,
          ...(isNotASingleActionType ? {} : getActionTypeFilter(types[0])),
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
