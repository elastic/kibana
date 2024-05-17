/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchRequest,
  QueryDslQueryContainer,
  QueryDslBoolQuery,
} from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { getDateFilters } from '../..';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { catchAndWrapError } from '../../../utils';
import type { LogsEndpointAction } from '../../../../../common/endpoint/types';
import type { GetActionDetailsListParam } from '../action_list';

/**
 * Fetches a list of Action Requests from the Endpoint action request index (not fleet)
 * @param agentTypes
 * @param commands
 * @param elasticAgentIds
 * @param esClient
 * @param endDate
 * @param from
 * @param size
 * @param startDate
 * @param userIds
 * @param unExpiredOnly
 * @param types
 */
export const fetchActionRequests = async ({
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
}: Omit<GetActionDetailsListParam, 'logger'>): Promise<LogsEndpointAction[]> => {
  // TODO:PT detach options type from `GetActionDetailsListParams`
  // TODO:PT maybe add a `logger` and log query and response?0

  const additionalFilters = [];

  if (commands?.length) {
    additionalFilters.push({ terms: { 'data.command': commands } });
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

  const must: QueryDslQueryContainer[] = [
    {
      bool: {
        filter: [...getDateFilters({ startDate, endDate }), ...additionalFilters],
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
    query: {
      bool: {
        must,
        ...(isNotASingleActionType ? {} : getActionTypeFilter(types[0])),
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  };

  const actionRequests = await esClient
    .search<LogsEndpointAction>(actionsSearchQuery, { ignore: [404] })
    .catch(catchAndWrapError);

  return (actionRequests?.hits?.hits ?? []).map((esHit) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return esHit._source!;
  });
};

/** @private */
const getActionTypeFilter = (actionType: string): QueryDslBoolQuery => {
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
