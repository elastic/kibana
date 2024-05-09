/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { fetchActionResponses } from './fetch_action_responses';
import { ENDPOINT_DEFAULT_PAGE_SIZE } from '../../../../common/endpoint/constants';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  ResponseActionStatus,
} from '../../../../common/endpoint/service/response_actions/constants';

import { getActions } from '../../utils/action_list_helpers';

import {
  categorizeResponseResults,
  createActionDetailsRecord,
  formatEndpointActionResults,
  getAgentHostNamesWithIds,
  mapToNormalizedActionRequest,
} from './utils';
import type { EndpointMetadataService } from '../metadata';
import { ACTIONS_SEARCH_PAGE_SIZE } from './constants';

interface OptionalFilterParams {
  agentTypes?: ResponseActionAgentType[];
  commands?: string[];
  elasticAgentIds?: string[];
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
  /** Will filter out the action requests so that only those show `expiration` date is greater than now */
  unExpiredOnly?: boolean;
  /** list of action Ids that should have outputs */
  withOutputs?: string[];
  /** Include automated response actions */
  types?: string[];
}

/**
 * Similar to #getActionList but takes statuses filter options
 * Retrieve a list of all (at most 10k) Actions from index (`ActionDetails`)
 * filter out action details based on statuses filter options
 */
export const getActionListByStatus = async ({
  agentTypes,
  commands,
  elasticAgentIds,
  esClient,
  endDate,
  logger,
  metadataService,
  page: _page,
  pageSize,
  startDate,
  statuses,
  userIds,
  unExpiredOnly = false,
  types,
  withOutputs,
}: OptionalFilterParams & {
  statuses: ResponseActionStatus[];
  esClient: ElasticsearchClient;
  logger: Logger;
  metadataService: EndpointMetadataService;
}): Promise<ActionListApiResponse> => {
  const size = pageSize ?? ENDPOINT_DEFAULT_PAGE_SIZE;
  const page = _page ?? 1;

  const { actionDetails: allActionDetails } = await getActionDetailsList({
    agentTypes,
    commands,
    elasticAgentIds,
    esClient,
    endDate,
    from: 0,
    logger,
    metadataService,
    size: ACTIONS_SEARCH_PAGE_SIZE,
    startDate,
    userIds,
    unExpiredOnly,
    types,
    withOutputs,
  });

  // filter out search results based on status filter options
  const actionDetailsByStatus = allActionDetails.filter((detail) =>
    statuses.includes(detail.status)
  );

  return {
    page,
    pageSize: size,
    startDate,
    endDate,
    agentTypes,
    elasticAgentIds,
    userIds,
    commands,
    statuses,
    // for size 20 -> page 1: (0, 20), page 2: (20, 40) ...etc
    data: actionDetailsByStatus.slice((page - 1) * size, size * page),
    total: actionDetailsByStatus.length,
  };
};

/**
 * Retrieve a list of Actions (`ActionDetails`)
 */
export const getActionList = async ({
  agentTypes,
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
  withOutputs,
  types,
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
    agentTypes,
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
    withOutputs,
    types,
  });

  return {
    page,
    pageSize: size,
    startDate,
    endDate,
    agentTypes,
    elasticAgentIds,
    userIds,
    commands,
    statuses: undefined,
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
  agentTypes,
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
  withOutputs,
  types,
}: GetActionDetailsListParam & {
  metadataService: EndpointMetadataService;
}): Promise<{
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
      agentTypes,
      commands,
      esClient,
      elasticAgentIds,
      startDate,
      endDate,
      from,
      size,
      userIds,
      unExpiredOnly,
      types,
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

  if (!actionRequests?.body?.hits?.hits) {
    // return empty details array
    return { actionDetails: [], totalRecords: 0 };
  }

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
      fetchActionResponses({ esClient, agentIds: elasticAgentIds, actionIds: actionReqIds }),

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
    results: actionResponses.data,
  });

  // compute action details list for each action id
  const actionDetails: ActionListApiResponse['data'] = normalizedActionRequests.map((action) => {
    // pick only those responses that match the current action id
    const matchedResponses = categorizedResponses.filter((categorizedResponse) =>
      categorizedResponse.type === 'response'
        ? categorizedResponse.item.data.EndpointActions.action_id === action.id
        : categorizedResponse.item.data.action_id === action.id
    );

    const actionRecord = createActionDetailsRecord(action, matchedResponses, agentsHostInfo);

    if (withOutputs && !withOutputs.includes(action.id)) {
      delete actionRecord.outputs;
    }

    return actionRecord;
  });

  return { actionDetails, totalRecords };
};
