/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { getActionCompletionInfo, mapToNormalizedActionRequest } from './utils';
import {
  ActionDetails,
  ActivityLogAction,
  ActivityLogActionResponse,
  EndpointAction,
  EndpointActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import {
  ACTION_REQUEST_INDICES,
  ACTION_RESPONSE_INDICES,
  catchAndWrapError,
  categorizeActionResults,
  categorizeResponseResults,
  getUniqueLogData,
} from '../../utils';
import { EndpointError } from '../../../../common/endpoint/errors';
import { NotFoundError } from '../../errors';
import { ACTIONS_SEARCH_PAGE_SIZE } from './constants';

export const getActionDetailsById = async (
  esClient: ElasticsearchClient,
  actionId: string
): Promise<ActionDetails> => {
  let actionRequestsLogEntries: Array<ActivityLogAction | EndpointActivityLogAction>;

  let normalizedActionRequest: ReturnType<typeof mapToNormalizedActionRequest> | undefined;
  let actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;

  try {
    // Get both the Action Request(s) and action Response(s)
    const [actionRequestEsSearchResults, actionResponsesEsSearchResults] = await Promise.all([
      // Get the action request(s)
      esClient
        .search<EndpointAction | LogsEndpointAction>(
          {
            index: ACTION_REQUEST_INDICES,
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

    actionRequestsLogEntries = getUniqueLogData(
      categorizeActionResults({
        results: actionRequestEsSearchResults?.hits?.hits ?? [],
      })
    ) as Array<ActivityLogAction | EndpointActivityLogAction>;

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

  const { isCompleted, completedAt } = getActionCompletionInfo(
    normalizedActionRequest.agents,
    actionResponses
  );

  const actionDetails: ActionDetails = {
    id: actionId,
    agents: normalizedActionRequest.agents,
    command: normalizedActionRequest.command,
    startedAt: normalizedActionRequest.createdAt,
    logEntries: [...actionRequestsLogEntries, ...actionResponses],
    isCompleted,
    completedAt,
    isExpired: !isCompleted && normalizedActionRequest.expiration < new Date().toISOString(),
  };

  return actionDetails;
};
