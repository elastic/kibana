/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EndpointError } from '../../../../common/endpoint/errors';
import type { ActionDetails, ActionListApiResponse } from '../../../../common/endpoint/types';
import { wrapErrorIfNeeded } from '../../utils';
import { NotFoundError } from '../../errors';

import {
  getActions,
  getActionResponses,
  getTimeSortedActionListLogEntries,
} from '../../utils/action_list_helpers';

import {
  categorizeActionResults,
  categorizeResponseResults,
  getActionCompletionInfo,
  mapToNormalizedActionRequest,
} from './utils';

interface OptionalFilterParams {
  commands?: string[];
  elasticAgentIds?: string[];
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
}

export const getActionList = async ({
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  logger,
  page: _page,
  pageSize,
  startDate,
  userIds,
}: OptionalFilterParams & {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<ActionListApiResponse> => {
  const size = pageSize ?? 10;
  const page = (_page ?? 1) - 1;
  // # of hits to skip
  const from = page * size;

  const data = await getActionDetailsList({
    commands,
    elasticAgentIds,
    esClient,
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
    commands,
    data,
    total: data.length,
  };
};

export type GetActionDetailsListParam = OptionalFilterParams & {
  esClient: ElasticsearchClient;
  from?: number;
  logger: Logger;
  size?: number;
};
const getActionDetailsList = async ({
  commands,
  elasticAgentIds,
  esClient,
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
    // fetch actions with matching agent_ids if any
    const { actionIds, actionRequests } = await getActions({
      commands,
      esClient,
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
    const err = wrapErrorIfNeeded(error);
    logger.error(err);
    throw err;
  }

  if (actions?.statusCode !== 200) {
    let errorMessage;
    let newError;
    // not found or index not found error
    if (actions?.statusCode === 404) {
      // log the error
      // return empty details array
      const baseMessage = 'Action list not found';
      errorMessage = elasticAgentIds
        ? `${baseMessage} for agentIds ${elasticAgentIds}`
        : baseMessage;
      return [];
    } else {
      // all other errors
      errorMessage = 'Error fetching action list';
      newError = new EndpointError(
        elasticAgentIds ? `${errorMessage}  for agentIds ${elasticAgentIds}` : errorMessage,
        actions
      );
    }
    logger.error(errorMessage);
    throw newError;
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
    actionIds: actionReqIds,
    elasticAgentIds,
    esClient,
  });

  // categorize responses as fleet and endpoint responses
  const categorizedResponses = categorizeResponseResults({
    results: actionResponses?.body?.hits?.hits,
  });

  // compute action details list for each action id
  const actionDetails: ActionDetails[] = normalizedActionRequests.map((action) => {
    // pick only those actions that match the current action id
    const matchedActions = categorizedActions.filter((categorizedAction) =>
      categorizedAction.type === 'action'
        ? categorizedAction.item.data.EndpointActions.action_id === action.id
        : categorizedAction.item.data.action_id === action.id
    );
    // pick only those responses that match the current action id
    const matchedResponses = categorizedResponses.filter((categorizedResponse) =>
      categorizedResponse.type === 'response'
        ? categorizedResponse.item.data.EndpointActions.action_id === action.id
        : categorizedResponse.item.data.action_id === action.id
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
      // sort the list by @timestamp in desc order, newest first
      logEntries: getTimeSortedActionListLogEntries([...matchedActions, ...matchedResponses]),
      isCompleted,
      completedAt,
      wasSuccessful,
      errors,
      isExpired: !isCompleted && action.expiration < new Date().toISOString(),
    };
  });

  return actionDetails;
};
