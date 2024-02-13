/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { fetchActionResponses } from './fetch_action_responses';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../common/endpoint/constants';
import {
  formatEndpointActionResults,
  categorizeResponseResults,
  mapToNormalizedActionRequest,
  getAgentHostNamesWithIds,
  createActionDetailsRecord,
} from './utils';
import type {
  ActionDetails,
  ActivityLogActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
} from '../../../../common/endpoint/types';
import { catchAndWrapError } from '../../utils';
import { EndpointError } from '../../../../common/endpoint/errors';
import { NotFoundError } from '../../errors';
import type { EndpointMetadataService } from '../metadata';

/**
 * Get Action Details for a single action id
 * @param esClient
 * @param metadataService
 * @param actionId
 */
export const getActionDetailsById = async <T extends ActionDetails = ActionDetails>(
  esClient: ElasticsearchClient,
  metadataService: EndpointMetadataService,
  actionId: string
): Promise<T> => {
  let actionRequestsLogEntries: EndpointActivityLogAction[];

  let normalizedActionRequest: ReturnType<typeof mapToNormalizedActionRequest> | undefined;
  let actionResponses: Array<ActivityLogActionResponse | EndpointActivityLogActionResponse>;

  try {
    // Get both the Action Request(s) and action Response(s)
    const [actionRequestEsSearchResults, allResponseEsHits] = await Promise.all([
      // Get the action request(s)
      esClient
        .search<LogsEndpointAction>(
          {
            index: ENDPOINT_ACTIONS_INDEX,
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
        .catch(catchAndWrapError),

      fetchActionResponses({ esClient, actionIds: [actionId] }).then((response) => response.data),
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
      results: allResponseEsHits,
    });
  } catch (error) {
    throw new EndpointError(error.message, error);
  }

  // If action id was not found, error out
  if (!normalizedActionRequest) {
    throw new NotFoundError(`Action with id '${actionId}' not found.`);
  }

  // get host metadata info with queried agents
  const agentsHostInfo =
    normalizedActionRequest.agentType === 'endpoint'
      ? await getAgentHostNamesWithIds({
          esClient,
          metadataService,
          agentIds: normalizedActionRequest.agents,
        })
      : {};

  return createActionDetailsRecord<T>(normalizedActionRequest, actionResponses, agentsHostInfo);
};
