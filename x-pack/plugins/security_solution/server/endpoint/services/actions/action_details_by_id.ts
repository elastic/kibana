/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import {
  formatEndpointActionResults,
  categorizeResponseResults,
  getActionCompletionInfo,
  mapToNormalizedActionRequest,
  getAgentHostNamesWithIds,
  getActionStatus,
} from './utils';
import type {
  ActionDetails,
  ActivityLogActionResponse,
  EndpointActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { catchAndWrapError } from '../../utils';
import { EndpointError } from '../../../../common/endpoint/errors';
import { NotFoundError } from '../../errors';
import { ACTION_RESPONSE_INDICES, ACTIONS_SEARCH_PAGE_SIZE } from './constants';
import type { EndpointMetadataService } from '../metadata';

export const getActionDetailsById = async (
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  actionId: string
): Promise<ActionDetails> => {
  let actionRequestsLogEntries: EndpointActivityLogAction[];

  let normalizedActionRequest: ReturnType<typeof mapToNormalizedActionRequest> | undefined;
  let actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;

  try {
    // Get both the Action Request(s) and action Response(s)
    const [actionRequestEsSearchResults, actionResponsesEsSearchResults] = await Promise.all([
      // Get the action request(s)
      esClient
        .search<LogsEndpointAction>(
          {
            index: ENDPOINT_ACTIONS_INDEX,
            body: {
              query: {
                bool: {
                  filter: [
                    { term: { action_id: actionId } },
                    { term: { input_type: 'endpoint' } },
                    { term: { type: 'INPUT_ACTION' } },
                  ],
                },
              },
            },
          },
          {
            ignore: [404],
          }
        )
        .catch(catchAndWrapError),

      // Get the Action Response(s)
      esClient
        .search<EndpointActionResponse | LogsEndpointActionResponse>(
          {
            index: ACTION_RESPONSE_INDICES,
            size: ACTIONS_SEARCH_PAGE_SIZE,
            body: {
              query: {
                bool: {
                  filter: [{ term: { action_id: actionId } }],
                },
              },
            },
          },
          { ignore: [404] }
        )
        .catch(catchAndWrapError),
    ]);

    actionRequestsLogEntries = formatEndpointActionResults(
      actionRequestEsSearchResults?.hits?.hits ?? []
    );

    // Multiple Action records could have been returned, but we only really
    // need one since they both hold similar data
    const actionDoc = actionRequestsLogEntries[0]?.item.data;

    if (actionDoc) {
      normalizedActionRequest = mapToNormalizedActionRequest(actionDoc);
    }

    actionResponses = categorizeResponseResults({
      results: actionResponsesEsSearchResults?.hits?.hits ?? [],
    }) as Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;
  } catch (error) {
    throw new EndpointError(error.message, error);
  }

  // If action id was not found, error out
  if (!normalizedActionRequest) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  }

  // get host metadata info with queried agents
  const agentsHostInfo = await getAgentHostNamesWithIds({
    esClient,
    metadataService,
    agentIds: normalizedActionRequest.agents,
  });

  const { isCompleted, completedAt, wasSuccessful, errors, outputs, agentState } =
    getActionCompletionInfo(normalizedActionRequest.agents, actionResponses);

  const { isExpired, status } = getActionStatus({
    expirationDate: normalizedActionRequest.expiration,
    isCompleted,
    wasSuccessful,
  });

  const actionDetails: ActionDetails = {
    id: actionId,
    agents: normalizedActionRequest.agents,
    hosts: normalizedActionRequest.agents.reduce<ActionDetails['hosts']>((acc, id) => {
      acc[id] = { name: agentsHostInfo[id] ?? '' };
      return acc;
    }, {}),
    command: normalizedActionRequest.command,
    startedAt: normalizedActionRequest.createdAt,
    isCompleted,
    completedAt,
    wasSuccessful,
    errors,
    isExpired,
    status,
    outputs,
    agentState,
    createdBy: normalizedActionRequest.createdBy,
    comment: normalizedActionRequest.comment,
    parameters: normalizedActionRequest.parameters,
  };

  return actionDetails;
};
