/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
  ENDPOINT_ACTIONS_INDEX,
} from '../../../../common/endpoint/constants';
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
  EndpointActionResponse,
  EndpointActivityLogAction,
  EndpointActivityLogActionResponse,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../../../../common/endpoint/types';
import { catchAndWrapError } from '../../utils';
import { EndpointError } from '../../../../common/endpoint/errors';
import { NotFoundError } from '../../errors';
import { ACTIONS_SEARCH_PAGE_SIZE } from './constants';
import type { EndpointMetadataService } from '../metadata';

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

      // Get the Action Response(s) from both the Fleet action response index and the Endpoint
      // action response index.
      // We query both indexes separately in order to ensure they are both queried - example if the
      // Fleet actions responses index does not exist yet, ES would generate a `404` and would
      // never actually query the Endpoint Actions index.
      Promise.all([
        // Responses in Fleet index
        esClient
          .search<EndpointActionResponse | LogsEndpointActionResponse>(
            {
              index: AGENT_ACTIONS_RESULTS_INDEX,
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

        // Response in Endpoint index
        esClient
          .search<EndpointActionResponse | LogsEndpointActionResponse>(
            {
              index: ENDPOINT_ACTION_RESPONSES_INDEX_PATTERN,
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
      ]).then(([fleetResponses, endpointResponses]) => {
        // Combine the hists and return
        const allResponses: Array<
          estypes.SearchHit<EndpointActionResponse | LogsEndpointActionResponse>
        > = [...(fleetResponses?.hits?.hits ?? []), ...(endpointResponses?.hits?.hits ?? [])];

        return allResponses;
      }),
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
  const agentsHostInfo = await getAgentHostNamesWithIds({
    esClient,
    metadataService,
    agentIds: normalizedActionRequest.agents,
  });

  return createActionDetailsRecord<T>(normalizedActionRequest, actionResponses, agentsHostInfo);
};
