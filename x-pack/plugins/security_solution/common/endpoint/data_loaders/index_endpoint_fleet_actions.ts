/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import type {
  EndpointAction,
  EndpointActionResponse,
  HostMetadata,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../types';
import { ENDPOINT_ACTIONS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX } from '../constants';
import { FleetActionGenerator } from '../data_generators/fleet_action_generator';
import { wrapErrorAndRejectPromise } from './utils';

const defaultFleetActionGenerator = new FleetActionGenerator();

export interface IndexedEndpointAndFleetActionsForHostResponse {
  actions: EndpointAction[];
  actionResponses: EndpointActionResponse[];
  actionsIndex: string;
  responsesIndex: string;
  endpointActions: LogsEndpointAction[];
  endpointActionResponses: LogsEndpointActionResponse[];
  endpointActionsIndex: string;
  endpointActionResponsesIndex: string;
}

export interface IndexEndpointAndFleetActionsForHostOptions {
  numResponseActions?: number;
}
/**
 * Indexes a random number of Endpoint (via Fleet) Actions for a given host
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 *
 * @param esClient
 * @param endpointHost
 * @param [fleetActionGenerator]
 */
export const indexEndpointAndFleetActionsForHost = async (
  esClient: Client,
  endpointHost: HostMetadata,
  fleetActionGenerator: FleetActionGenerator = defaultFleetActionGenerator,
  options: IndexEndpointAndFleetActionsForHostOptions = {}
): Promise<IndexedEndpointAndFleetActionsForHostResponse> => {
  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };
  const agentId = endpointHost.elastic.agent.id;
  const actionsCount = options.numResponseActions ?? 1;
  const total = fleetActionGenerator.randomN(5) + actionsCount;
  const response: IndexedEndpointAndFleetActionsForHostResponse = {
    actions: [],
    actionResponses: [],
    endpointActions: [],
    endpointActionResponses: [],
    actionsIndex: AGENT_ACTIONS_INDEX,
    responsesIndex: AGENT_ACTIONS_RESULTS_INDEX,
    endpointActionsIndex: ENDPOINT_ACTIONS_INDEX,
    endpointActionResponsesIndex: ENDPOINT_ACTION_RESPONSES_INDEX,
  };

  for (let i = 0; i < total; i++) {
    // create an action
    const action = fleetActionGenerator.generate({
      data: { comment: 'data generator: this host is bad' },
    });

    action.agents = [agentId];
    const indexFleetActions = esClient
      .index(
        {
          index: AGENT_ACTIONS_INDEX,
          body: action,
          refresh: 'wait_for',
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    const endpointActionsBody: LogsEndpointAction & {
      EndpointActions: LogsEndpointAction['EndpointActions'] & {
        '@timestamp': undefined;
        user_id: undefined;
      };
    } = {
      EndpointActions: {
        ...action,
        '@timestamp': undefined,
        user_id: undefined,
      },
      agent: {
        id: [agentId],
      },
      '@timestamp': action['@timestamp'],
      user: {
        id: action.user_id,
      },
    };

    await Promise.all([
      indexFleetActions,
      esClient
        .index({
          index: ENDPOINT_ACTIONS_INDEX,
          body: endpointActionsBody,
          refresh: 'wait_for',
        })
        .catch(wrapErrorAndRejectPromise),
    ]);

    const randomFloat = fleetActionGenerator.randomFloat();
    // Create an action response for the above
    const actionResponse = fleetActionGenerator.generateResponse({
      action_id: action.action_id,
      agent_id: agentId,
      action_response: {
        endpoint: {
          // add ack to 4/5th of fleet response
          ack: randomFloat < 0.8 ? true : undefined,
        },
      },
      // error for 1/10th of responses
      error: randomFloat < 0.1 ? 'some error happened' : undefined,
    });

    const indexFleetResponses = esClient
      .index(
        {
          index: AGENT_ACTIONS_RESULTS_INDEX,
          body: actionResponse,
          refresh: 'wait_for',
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    // 70% has endpoint response
    if (randomFloat < 0.7) {
      const endpointActionResponseBody = {
        EndpointActions: {
          ...actionResponse,
          data: actionResponse.action_data,
          '@timestamp': undefined,
          action_data: undefined,
          agent_id: undefined,
          error: undefined,
        },
        agent: {
          id: agentId,
        },
        // error for 1/10th of responses
        error:
          randomFloat < 0.1
            ? {
                message: actionResponse.error,
              }
            : undefined,
        '@timestamp': actionResponse['@timestamp'],
      };

      await Promise.all([
        indexFleetResponses,
        esClient
          .index({
            index: ENDPOINT_ACTION_RESPONSES_INDEX,
            body: endpointActionResponseBody,
            refresh: 'wait_for',
          })
          .catch(wrapErrorAndRejectPromise),
      ]);
    } else {
      // 30% has only fleet response
      await indexFleetResponses;
    }

    response.actions.push(action);
    response.actionResponses.push(actionResponse);
  }

  // Add edge case fleet actions (maybe)
  if (fleetActionGenerator.randomFloat() < 0.3) {
    const randomFloat = fleetActionGenerator.randomFloat();

    const actionStartedAt = {
      '@timestamp': new Date().toISOString(),
    };
    // 70% of the time just add either an Isolate -OR- an UnIsolate action
    if (randomFloat < 0.7) {
      let action: EndpointAction;

      if (randomFloat < 0.3) {
        // add a pending isolation
        action = fleetActionGenerator.generateIsolateAction(actionStartedAt);
      } else {
        // add a pending UN-isolation
        action = fleetActionGenerator.generateUnIsolateAction(actionStartedAt);
      }

      action.agents = [agentId];

      await esClient
        .index(
          {
            index: AGENT_ACTIONS_INDEX,
            body: action,
            refresh: 'wait_for',
          },
          ES_INDEX_OPTIONS
        )
        .catch(wrapErrorAndRejectPromise);

      response.actions.push(action);
    } else {
      // Else (30% of the time) add a pending isolate AND pending un-isolate
      const action1 = fleetActionGenerator.generateIsolateAction(actionStartedAt);
      const action2 = fleetActionGenerator.generateUnIsolateAction(actionStartedAt);

      action1.agents = [agentId];
      action2.agents = [agentId];

      await Promise.all([
        esClient
          .index(
            {
              index: AGENT_ACTIONS_INDEX,
              body: action1,
              refresh: 'wait_for',
            },
            ES_INDEX_OPTIONS
          )
          .catch(wrapErrorAndRejectPromise),
        esClient
          .index(
            {
              index: AGENT_ACTIONS_INDEX,
              body: action2,
              refresh: 'wait_for',
            },
            ES_INDEX_OPTIONS
          )
          .catch(wrapErrorAndRejectPromise),
      ]);

      response.actions.push(action1, action2);
    }
  }

  return response;
};

export interface DeleteIndexedEndpointFleetActionsResponse {
  actions: estypes.DeleteByQueryResponse | undefined;
  responses: estypes.DeleteByQueryResponse | undefined;
  endpointActionRequests: estypes.DeleteByQueryResponse | undefined;
  endpointActionResponses: estypes.DeleteByQueryResponse | undefined;
}

export const deleteIndexedEndpointAndFleetActions = async (
  esClient: Client,
  indexedData: IndexedEndpointAndFleetActionsForHostResponse
): Promise<DeleteIndexedEndpointFleetActionsResponse> => {
  const response: DeleteIndexedEndpointFleetActionsResponse = {
    actions: undefined,
    responses: undefined,
    endpointActionRequests: undefined,
    endpointActionResponses: undefined,
  };

  if (indexedData.actions.length) {
    [response.actions, response.endpointActionRequests] = await Promise.all([
      esClient
        .deleteByQuery({
          index: `${indexedData.actionsIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  { terms: { action_id: indexedData.actions.map((action) => action.action_id) } },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
      esClient
        .deleteByQuery({
          index: `${indexedData.endpointActionsIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  { terms: { action_id: indexedData.actions.map((action) => action.action_id) } },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
    ]);
  }

  if (indexedData.actionResponses) {
    [response.responses, response.endpointActionResponses] = await Promise.all([
      esClient
        .deleteByQuery({
          index: `${indexedData.responsesIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      action_id: indexedData.actionResponses.map((action) => action.action_id),
                    },
                  },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
      esClient
        .deleteByQuery({
          index: `${indexedData.endpointActionResponsesIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      action_id: indexedData.actionResponses.map((action) => action.action_id),
                    },
                  },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise),
    ]);
  }

  return response;
};
