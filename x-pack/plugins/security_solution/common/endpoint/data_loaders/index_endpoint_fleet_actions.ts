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
import { ENDPOINT_ACTION_RESPONSES_INDEX, ENDPOINT_ACTIONS_INDEX } from '../constants';
import { FleetActionGenerator } from '../data_generators/fleet_action_generator';
import { wrapErrorAndRejectPromise } from './utils';
import { EndpointActionGenerator } from '../data_generators/endpoint_action_generator';

const fleetActionGenerator = new FleetActionGenerator();
const endpointActionGenerator = new EndpointActionGenerator();

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
  alertIds?: string[];
}

/**
 * Indexes a random number of Endpoint (via Fleet) Actions for a given host
 * (NOTE: ensure that fleet is set up first before calling this loading function)
 *
 * @param esClient
 * @param endpointHost
 * @param options
 */
export const indexEndpointAndFleetActionsForHost = async (
  esClient: Client,
  endpointHost: HostMetadata,
  options: IndexEndpointAndFleetActionsForHostOptions = {}
): Promise<IndexedEndpointAndFleetActionsForHostResponse> => {
  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };
  const agentId = endpointHost.elastic.agent.id;
  const actionsCount = options.numResponseActions ?? 1;
  const total = actionsCount === 1 ? actionsCount : fleetActionGenerator.randomN(5) + actionsCount;
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
    // start with endpoint action
    const logsEndpointAction: LogsEndpointAction = endpointActionGenerator.generate({
      EndpointActions: {
        data: {
          comment: 'data generator: this host is bad',
          ...(options.alertIds ? { command: 'isolate' } : {}),
        },
      },
    });

    const fleetAction: EndpointAction = {
      ...logsEndpointAction.EndpointActions,
      '@timestamp': logsEndpointAction['@timestamp'],
      agents:
        typeof logsEndpointAction.agent.id === 'string'
          ? [logsEndpointAction.agent.id]
          : logsEndpointAction.agent.id,
      user_id: logsEndpointAction.user.id,
    };

    // index fleet action
    const indexFleetActions = esClient
      .index<EndpointAction>(
        {
          index: AGENT_ACTIONS_INDEX,
          body: fleetAction,
          refresh: 'wait_for',
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    const logsEndpointActionsBody: LogsEndpointAction = {
      ...logsEndpointAction,
      EndpointActions: {
        ...logsEndpointAction.EndpointActions,
        data: {
          ...logsEndpointAction.EndpointActions.data,
          alert_id: options.alertIds,
        },
      },
      // to test automated actions in cypress
      user: options.alertIds ? { id: 'unknown' } : logsEndpointAction.user,
      rule: options.alertIds
        ? {
            id: 'generated_rule_id',
            name: 'generated_rule_name',
          }
        : logsEndpointAction.rule,
    };

    await Promise.all([
      indexFleetActions,
      esClient
        .index<LogsEndpointAction>({
          index: ENDPOINT_ACTIONS_INDEX,
          body: logsEndpointActionsBody,
          refresh: 'wait_for',
        })
        .catch(wrapErrorAndRejectPromise),
    ]);

    const randomFloat = fleetActionGenerator.randomFloat();
    // Create an action response for the above
    const fleetActionResponse: EndpointActionResponse = fleetActionGenerator.generateResponse({
      action_id: logsEndpointAction.EndpointActions.action_id,
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
      .index<EndpointActionResponse>(
        {
          index: AGENT_ACTIONS_RESULTS_INDEX,
          body: fleetActionResponse,
          refresh: 'wait_for',
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    // 70% has endpoint response
    if (randomFloat < 0.7) {
      const endpointActionResponseBody = {
        EndpointActions: {
          ...fleetActionResponse,
          data: fleetActionResponse.action_data,
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
                message: fleetActionResponse.error,
              }
            : undefined,
        '@timestamp': fleetActionResponse['@timestamp'],
      };

      await Promise.all([
        indexFleetResponses,
        esClient
          .index<LogsEndpointActionResponse>({
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

    response.actions.push(fleetAction);
    response.actionResponses.push(fleetActionResponse);
  }

  // Add edge case fleet actions (maybe)
  if (fleetActionGenerator.randomFloat() < 0.3) {
    const randomFloat = fleetActionGenerator.randomFloat();

    const actionStartedAt = {
      '@timestamp': new Date().toISOString(),
    };
    // 70% of the time just add either an Isolate -OR- an UnIsolate action
    if (randomFloat < 0.7) {
      let fleetAction: EndpointAction;

      if (randomFloat < 0.3) {
        // add a pending isolation
        fleetAction = fleetActionGenerator.generateIsolateAction(actionStartedAt);
      } else {
        // add a pending UN-isolation
        fleetAction = fleetActionGenerator.generateUnIsolateAction(actionStartedAt);
      }

      fleetAction.agents = [agentId];

      await esClient
        .index<EndpointAction>(
          {
            index: AGENT_ACTIONS_INDEX,
            body: fleetAction,
            refresh: 'wait_for',
          },
          ES_INDEX_OPTIONS
        )
        .catch(wrapErrorAndRejectPromise);

      response.actions.push(fleetAction);
    } else {
      // Else (30% of the time) add a pending isolate AND pending un-isolate
      const fleetAction1 = fleetActionGenerator.generateIsolateAction(actionStartedAt);
      const fleetAction2 = fleetActionGenerator.generateUnIsolateAction(actionStartedAt);

      fleetAction1.agents = [agentId];
      fleetAction2.agents = [agentId];

      await Promise.all([
        esClient
          .index<EndpointAction>(
            {
              index: AGENT_ACTIONS_INDEX,
              body: fleetAction1,
              refresh: 'wait_for',
            },
            ES_INDEX_OPTIONS
          )
          .catch(wrapErrorAndRejectPromise),
        esClient
          .index<EndpointAction>(
            {
              index: AGENT_ACTIONS_INDEX,
              body: fleetAction2,
              refresh: 'wait_for',
            },
            ES_INDEX_OPTIONS
          )
          .catch(wrapErrorAndRejectPromise),
      ]);

      response.actions.push(fleetAction1, fleetAction2);
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
