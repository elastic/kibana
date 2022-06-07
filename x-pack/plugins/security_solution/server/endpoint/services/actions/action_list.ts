/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import type { ActionDetails, ActionListApiResponse } from '../../../../common/endpoint/types';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

import {
  getActionsForAgents,
  getActionResponses,
  getTimeSortedActionDetails,
} from '../../utils/action_list_helpers';

import {
  categorizeActionResults,
  categorizeResponseResults,
  getActionCompletionInfo,
  mapToNormalizedActionRequest,
} from './utils';

interface GetActionListParam {
  actionTypes?: string[];
  context: SecuritySolutionRequestHandlerContext;
  elasticAgentIds?: string[];
  endDate?: string;
  logger: Logger;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
}

export const getActionList = async ({
  actionTypes,
  context,
  elasticAgentIds,
  endDate,
  logger,
  page: _page,
  pageSize,
  startDate,
  userIds,
}: GetActionListParam): Promise<ActionListApiResponse> => {
  const size = Math.floor(pageSize ?? 50 / 2);
  const page = _page ?? 1;
  const from = page <= 1 ? 0 : page * size - size + 1;

  const data = await getActionDetailsList({
    actionTypes,
    context,
    elasticAgentIds,
    endDate,
    from,
    logger,
    size,
    startDate,
    userIds,
  });

  return {
    page,
    pageSize,
    startDate,
    endDate,
    userIds,
    commands: actionTypes,
    data,
  };
};

export interface GetActionDetailsListParam extends GetActionListParam {
  from?: number;
  size?: number;
}
const getActionDetailsList = async ({
  actionTypes,
  context,
  elasticAgentIds,
  endDate,
  from,
  logger,
  size,
  startDate,
  userIds,
}: GetActionDetailsListParam): Promise<ActionDetails[]> => {
  let actions;
  let actionReqIds;

  try {
    // fetch actions with matching agent_id
    const { actionIds, actionRequests } = await getActionsForAgents({
      actionTypes,
      context,
      logger,
      elasticAgentIds,
      startDate,
      endDate,
      from,
      size,
      userIds,
    });
    actions = actionRequests;
    actionReqIds = actionIds;
  } catch (error) {
    logger.error(error);
    throw error;
  }

  if (actions?.statusCode !== 200) {
    logger.error(`Error fetching actions log for agent_ids ${elasticAgentIds}`);
    throw new Error(`Error fetching actions log for agent_ids ${elasticAgentIds}`);
  }

  // categorize actions as fleet and endpoint actions
  const categorizedActions = categorizeActionResults({
    results: actions?.body?.hits?.hits,
  });

  // normalized actions with a flat structure to access relevant values
  const normalizedActionRequests: Array<ReturnType<typeof mapToNormalizedActionRequest>> =
    categorizedActions.map((action) => mapToNormalizedActionRequest(action.item.data));

  // get all responses for given action Ids and agent Ids
  const actionResponses = await getActionResponses({
    context,
    logger,
    elasticAgentIds,
    actionIds: actionReqIds,
  });

  // categorize responses as fleet and endpoint responses
  const categorizedResponses = categorizeResponseResults({
    results: actionResponses?.body?.hits?.hits,
  });

  // compute action details list for each action id
  const actionDetails: ActionDetails[] = normalizedActionRequests.map((action) => {
    // pick only those actions that match the current action id
    const matchedActions = categorizedActions.filter((ac) =>
      ac.type === 'action'
        ? ac.item.data.EndpointActions.action_id === action.id
        : ac.item.data.action_id === action.id
    );
    // pick only those responses that match the current action id
    const matchedResponses = categorizedResponses.filter((re) =>
      re.type === 'response'
        ? re.item.data.EndpointActions.action_id === action.id
        : re.item.data.action_id === action.id
    );

    // find the specific response's details using that set of matching responses
    const { isCompleted, completedAt, wasSuccessful, errors } = getActionCompletionInfo(
      action.agents,
      matchedResponses
    );

    return {
      id: action.id,
      agents: action.agents,
      command: action.command,
      startedAt: action.createdAt,
      logEntries: [...matchedActions, ...matchedResponses],
      isCompleted,
      completedAt,
      wasSuccessful,
      errors,
      isExpired: !isCompleted && action.expiration < new Date().toISOString(),
    };
  });

  // sort the list by startedAt in desc order, newest first
  const sortedData = getTimeSortedActionDetails(actionDetails);

  return sortedData;
};
