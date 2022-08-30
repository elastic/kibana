/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../../common/endpoint/constants';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { ActionDetails, ActionListApiResponse } from '../../../../common/endpoint/types';

import { getActions, getActionResponses } from '../../utils/action_list_helpers';

import {
  formatEndpointActionResults,
  categorizeResponseResults,
  getActionCompletionInfo,
  mapToNormalizedActionRequest,
  getAgentHostNamesWithIds,
} from './utils';
import type { EndpointMetadataService } from '../metadata';

interface OptionalFilterParams {
  commands?: string[];
  elasticAgentIds?: string[];
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
  /** Will filter out the action requests so that only those show `expiration` date is greater than now */
  unExpiredOnly?: boolean;
}

/**
 * Retrieve a list of Actions (`ActionDetails`)
 */
export const getActionList = async ({
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  logger,
  metadataService,
  page: _page,
  pageSize,
  startDate,
  userIds,
  unExpiredOnly = false,
}: OptionalFilterParams & {
  esClient: ElasticsearchClient;
  logger: Logger;
  metadataService: EndpointMetadataService;
}): Promise<ActionListApiResponse> => {
  const size = pageSize ?? ENDPOINT_DEFAULT_PAGE_SIZE;
  const page = _page ?? 1;
  // # of hits to skip
  const from = (page - 1) * size;

  const { actionDetails, totalRecords } = await getActionDetailsList({
    commands,
    elasticAgentIds,
    esClient,
    endDate,
    from,
    logger,
    metadataService,
    size,
    startDate,
    userIds,
    unExpiredOnly,
  });

  return {
    page,
    pageSize: size,
    startDate,
    endDate,
    elasticAgentIds,
    userIds,
    commands,
    data: actionDetails,
    total: totalRecords,
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
  metadataService,
  size,
  startDate,
  userIds,
  unExpiredOnly,
}: GetActionDetailsListParam & { metadataService: EndpointMetadataService }): Promise<{
  actionDetails: ActionListApiResponse['data'];
  totalRecords: number;
}> => {
  let actionRequests;
  let actionReqIds;
  let actionResponses;
  let agentsHostInfo: { [id: string]: string };

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
      unExpiredOnly,
    });
    actionRequests = _actionRequests;
    actionReqIds = actionIds;
  } catch (error) {
    // all other errors
    const err = new CustomHttpRequestError(
      error.meta?.meta?.body?.error?.reason ??
        `Unknown error while fetching action requests (${error.message})`,
      error.meta?.meta?.statusCode ?? 500,
      error
    );
    logger.error(err);
    throw err;
  }

  // return empty details array
  if (!actionRequests?.body?.hits?.hits) return { actionDetails: [], totalRecords: 0 };

  // format endpoint actions into { type, item } structure
  const formattedActionRequests = formatEndpointActionResults(actionRequests?.body?.hits?.hits);
  const totalRecords = (actionRequests?.body?.hits?.total as unknown as SearchTotalHits).value;

  // normalized actions with a flat structure to access relevant values
  const normalizedActionRequests: Array<ReturnType<typeof mapToNormalizedActionRequest>> =
    formattedActionRequests.map((action) => mapToNormalizedActionRequest(action.item.data));

  try {
    // get all responses for given action Ids and agent Ids
    // and get host metadata info with queried agents
    [actionResponses, agentsHostInfo] = await Promise.all([
      getActionResponses({
        actionIds: actionReqIds,
        elasticAgentIds,
        esClient,
      }),
      await getAgentHostNamesWithIds({
        esClient,
        metadataService,
        agentIds: normalizedActionRequests.map((action) => action.agents).flat(),
      }),
    ]);
  } catch (error) {
    // all other errors
    const err = new CustomHttpRequestError(
      error.meta?.meta?.body?.error?.reason ??
        `Unknown error while fetching action responses (${error.message})`,
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
    // pick only those responses that match the current action id
    const matchedResponses = categorizedResponses.filter((categorizedResponse) =>
      categorizedResponse.type === 'response'
        ? categorizedResponse.item.data.EndpointActions.action_id === action.id
        : categorizedResponse.item.data.action_id === action.id
    );

    // find the specific response's details using that set of matching responses
    const { isCompleted, completedAt, wasSuccessful, errors, agentState } = getActionCompletionInfo(
      action.agents,
      matchedResponses
    );

    // NOTE: `outputs` is not returned in this service because including it on a list of data
    // could result in a very large response unnecessarily. In the future, we might include
    // an option to optionally include it.
    return {
      id: action.id,
      agents: action.agents,
      hosts: action.agents.reduce<ActionDetails['hosts']>((acc, id) => {
        acc[id] = { name: agentsHostInfo[id] };
        return acc;
      }, {}),
      command: action.command,
      startedAt: action.createdAt,
      isCompleted,
      completedAt,
      wasSuccessful,
      errors,
      agentState,
      isExpired: !isCompleted && action.expiration < new Date().toISOString(),
      createdBy: action.createdBy,
      comment: action.comment,
      parameters: action.parameters,
    };
  });

  return { actionDetails, totalRecords };
};
