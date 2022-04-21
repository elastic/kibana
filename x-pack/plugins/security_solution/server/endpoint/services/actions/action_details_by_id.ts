/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  ActionDetails,
  ActivityLogAction,
  EndpointAction,
  EndpointActionResponse,
  EndpointActivityLogAction,
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

export const getActionDetailsById = async (
  esClient: ElasticsearchClient,
  actionId: string
): Promise<ActionDetails> => {
  let actionRequests: Array<ActivityLogAction | EndpointActivityLogAction>;
  let actionResponses;

  try {
    const actionRequestEsSearchResults = await esClient
      .search<EndpointAction | LogsEndpointAction>(
        {
          index: ACTION_REQUEST_INDICES,
          body: {
            query: {
              bool: {
                filter: [{ term: { action_id: actionId } }],
              },
            },
          },
        },
        {
          ignore: [404],
        }
      )
      .catch(catchAndWrapError);

    actionRequests = getUniqueLogData(
      categorizeActionResults({
        results: actionRequestEsSearchResults?.hits?.hits ?? [],
      })
    ) as Array<ActivityLogAction | EndpointActivityLogAction>;

    const actionResponsesEsSearchResults = await esClient
      .search<EndpointActionResponse | LogsEndpointActionResponse>(
        {
          index: ACTION_RESPONSE_INDICES,
          size: 1000,
          body: {
            query: {
              bool: {
                filter: [{ term: { action_id: actionId } }],
              },
            },
          },
          // FIXME:PT need to sort this in ascending order
        },
        { ignore: [404] }
      )
      .catch(catchAndWrapError);

    actionResponses = getUniqueLogData(
      categorizeResponseResults({
        results: actionResponsesEsSearchResults?.hits?.hits ?? [],
      })
    );
  } catch (error) {
    throw new EndpointError(error.message, error);
  }

  // If action id was not found, error out
  if (actionRequests.length === 0) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  }

  const isCompleted = false; // FIXME:PT calculate
  const completedAt = undefined; // FIXME:PT calculate

  const actionDetails: ActionDetails = {
    id: actionId,
    endpointIds: [...(actionRequests[0].item.data.agents ?? [])],
    actionType: actionRequests[0].item.data.data.command,
    startedAt: actionRequests[0].item.data['@timestamp'],
    items: [...actionRequests, ...actionResponses],
    isCompleted,
    completedAt,
    isExpired: !isCompleted && actionRequests[0].item.data.expiration < new Date().toISOString(),
  };

  return actionDetails;
};
