/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';
import type {
  ActivityLog,
  ActivityLogEntry,
  EndpointAction,
  EndpointActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { getActionRequestsResult, getActionResponsesResult, getTimeSortedData } from '../../utils';

import { categorizeActionResults, categorizeResponseResults, getUniqueLogData } from './utils';

export const getAuditLogResponse = async ({
  elasticAgentId,
  page,
  pageSize,
  startDate,
  endDate,
  context,
  logger,
}: {
  elasticAgentId: string;
  page: number;
  pageSize: number;
  startDate: string;
  endDate: string;
  context: SecuritySolutionRequestHandlerContext;
  logger: Logger;
}): Promise<ActivityLog> => {
  const size = Math.floor(pageSize / 2);
  const from = page <= 1 ? 0 : page * size - size + 1;

  const data = await getActivityLog({
    context,
    from,
    size,
    startDate,
    endDate,
    elasticAgentId,
    logger,
  });

  return {
    page,
    pageSize,
    startDate,
    endDate,
    data,
  };
};

const getActivityLog = async ({
  context,
  size,
  from,
  startDate,
  endDate,
  elasticAgentId,
  logger,
}: {
  context: SecuritySolutionRequestHandlerContext;
  elasticAgentId: string;
  size: number;
  from: number;
  startDate: string;
  endDate: string;
  logger: Logger;
}): Promise<ActivityLogEntry[]> => {
  let actionsResult: TransportResult<estypes.SearchResponse<unknown>, unknown>;
  let responsesResult: TransportResult<estypes.SearchResponse<unknown>, unknown>;

  try {
    // fetch actions with matching agent_id
    const { actionIds, actionRequests } = await getActionRequestsResult({
      context,
      logger,
      elasticAgentId,
      startDate,
      endDate,
      size,
      from,
    });
    actionsResult = actionRequests;

    // fetch responses with matching unique set of `action_id`s
    responsesResult = await getActionResponsesResult({
      actionIds: [...new Set(actionIds)], // de-dupe `action_id`s
      context,
      logger,
      elasticAgentId,
      startDate,
      endDate,
    });
  } catch (error) {
    logger.error(error);
    throw error;
  }
  if (actionsResult?.statusCode !== 200) {
    logger.error(`Error fetching actions log for agent_id ${elasticAgentId}`);
    throw new Error(`Error fetching actions log for agent_id ${elasticAgentId}`);
  }

  // label record as `action`, `fleetAction`
  const responses = categorizeResponseResults({
    results: responsesResult?.body?.hits?.hits as Array<
      estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>
    >,
  });

  // label record as `response`, `fleetResponse`
  const actions = categorizeActionResults({
    results: actionsResult?.body?.hits?.hits as Array<
      estypes.SearchHit<EndpointAction | LogsEndpointAction>
    >,
  });

  // filter out the duplicate endpoint actions that also have fleetActions
  // include endpoint actions that have no fleet actions
  const uniqueLogData = getUniqueLogData([...responses, ...actions]);

  // sort by @timestamp in desc order, newest first
  const sortedData = getTimeSortedData(uniqueLogData);

  return sortedData;
};
