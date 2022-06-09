/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type {
  ActionDetails,
  ActionListApiResponse,
  EndpointActivityLogAction,
} from '../../../../common/endpoint/types';

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
  from: number;
  logger: Logger;
  size: number;
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
  let actionRequests;
  let actionReqIds;
  let actionResponses;

  try {
    // fetch actions with matching agent_ids if any
    const { actionIds, actionRequests: _actionRequests } = await getActions({
      commands,
      esClient,
      elasticAgentIds,
      startDate,
      endDate,
      from,
      size,
      userIds,
    });
    actionRequests = _actionRequests;
    actionReqIds = actionIds;
  } catch (error) {
    // all other errors
    const err = new CustomHttpRequestError(
      error.meta?.meta?.body?.error?.reason ?? 'Unknown error while fetching action requests',
      error.meta?.meta?.statusCode ?? 500,
      error
    );
    logger.error(err);
    throw err;
  }

  // return empty details array
  if (!actionRequests?.body?.hits?.hits) return [];

  // format endpoint actions into { type, item } structure
  const categorizedActions = categorizeActionResults({
    results: actionRequests?.body?.hits?.hits,
  }) as EndpointActivityLogAction[];

  // normalized actions with a flat structure to access relevant values
  const normalizedActionRequests: Array<ReturnType<typeof mapToNormalizedActionRequest>> =
    categorizedActions.map((action) => mapToNormalizedActionRequest(action.item.data));

  try {
    // get all responses for given action Ids and agent Ids
    actionResponses = await getActionResponses({
      actionIds: actionReqIds,
      elasticAgentIds,
      esClient,
    });
  } catch (error) {
    // all other errors
    const err = new CustomHttpRequestError(
      error.meta?.meta?.body?.error?.reason ?? 'Unknown error while fetching action responses',
      error.meta?.meta?.statusCode ?? 500,
      error
    );
    logger.error(err);
    throw err;
  }

  // categorize responses as fleet and endpoint responses
  const categorizedResponses = categorizeResponseResults({
    results: actionResponses?.body?.hits?.hits,
  });

  // compute action details list for each action id
  const actionDetails: ActionDetails[] = normalizedActionRequests.map((action) => {
    // pick only those actions that match the current action id
    const matchedActions = categorizedActions.filter(
      (categorizedAction) => categorizedAction.item.data.EndpointActions.action_id === action.id
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
