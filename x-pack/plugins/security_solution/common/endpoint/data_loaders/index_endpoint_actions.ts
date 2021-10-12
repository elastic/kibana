/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/api/types';
import { HostMetadata } from '../types';
import {
  EndpointActionGenerator,
  LogsEndpointAction,
  LogsEndpointActionResponse,
} from '../data_generators/endpoint_action_generator';
import { wrapErrorAndRejectPromise } from './utils';
import { ENDPOINT_ACTIONS_INDEX, ENDPOINT_ACTION_RESPONSES_INDEX } from '../constants';

const defaultEndpointActionGenerator = new EndpointActionGenerator();

export interface IndexedEndpointActionsForHostResponse {
  endpointActions: LogsEndpointAction[];
  endpointActionResponses: LogsEndpointActionResponse[];
  endpointActionsIndex: string;
  endpointActionResponsesIndex: string;
}

/**
 * Indexes a random number of Endpoint Actions for a given host
 *
 * @param esClient
 * @param endpointHost
 * @param [endpointActionGenerator]
 */
export const indexEndpointActionsForHost = async (
  esClient: Client,
  endpointHost: HostMetadata,
  endpointActionGenerator: EndpointActionGenerator = defaultEndpointActionGenerator
): Promise<IndexedEndpointActionsForHostResponse> => {
  const agentId = endpointHost.elastic.agent.id;
  const total = endpointActionGenerator.randomN(5);
  const response: IndexedEndpointActionsForHostResponse = {
    endpointActions: [],
    endpointActionResponses: [],
    endpointActionsIndex: ENDPOINT_ACTIONS_INDEX,
    endpointActionResponsesIndex: ENDPOINT_ACTION_RESPONSES_INDEX,
  };

  for (let i = 0; i < total; i++) {
    // create an action
    const action = endpointActionGenerator.generate({
      EndpointAction: {
        data: { comment: 'data generator: this host is same as bad' },
      },
    });

    action.agent.id = [agentId];

    await esClient
      .index({
        index: ENDPOINT_ACTIONS_INDEX,
        body: action,
      })
      .catch(wrapErrorAndRejectPromise);

    // Create an action response for the above
    const actionResponse = endpointActionGenerator.generateResponse({
      agent: { id: agentId },
      EndpointAction: {
        action_id: action.EndpointAction.action_id,
        data: action.EndpointAction.data,
      },
    });

    await esClient
      .index({
        index: ENDPOINT_ACTION_RESPONSES_INDEX,
        body: actionResponse,
      })
      .catch(wrapErrorAndRejectPromise);

    response.endpointActions.push(action);
    response.endpointActionResponses.push(actionResponse);
  }

  // Add edge cases (maybe)
  if (endpointActionGenerator.randomFloat() < 0.3) {
    const randomFloat = endpointActionGenerator.randomFloat();

    // 60% of the time just add either an Isolate -OR- an UnIsolate action
    if (randomFloat < 0.6) {
      let action: LogsEndpointAction;

      if (randomFloat < 0.3) {
        // add a pending isolation
        action = endpointActionGenerator.generateIsolateAction({
          '@timestamp': new Date().toISOString(),
        });
      } else {
        // add a pending UN-isolation
        action = endpointActionGenerator.generateUnIsolateAction({
          '@timestamp': new Date().toISOString(),
        });
      }

      action.agent.id = [agentId];

      await esClient
        .index({
          index: ENDPOINT_ACTIONS_INDEX,
          body: action,
        })
        .catch(wrapErrorAndRejectPromise);

      response.endpointActions.push(action);
    } else {
      // Else (40% of the time) add a pending isolate AND pending un-isolate
      const action1 = endpointActionGenerator.generateIsolateAction({
        '@timestamp': new Date().toISOString(),
      });
      const action2 = endpointActionGenerator.generateUnIsolateAction({
        '@timestamp': new Date().toISOString(),
      });

      action1.agent.id = [agentId];
      action2.agent.id = [agentId];

      await Promise.all([
        esClient
          .index({
            index: ENDPOINT_ACTIONS_INDEX,
            body: action1,
          })
          .catch(wrapErrorAndRejectPromise),
        esClient
          .index({
            index: ENDPOINT_ACTIONS_INDEX,
            body: action2,
          })
          .catch(wrapErrorAndRejectPromise),
      ]);

      response.endpointActions.push(action1, action2);
    }
  }

  return response;
};

export interface DeleteIndexedEndpointActionsResponse {
  endpointActionRequests: DeleteByQueryResponse | undefined;
  endpointActionResponses: DeleteByQueryResponse | undefined;
}

export const deleteIndexedEndpointActions = async (
  esClient: Client,
  indexedData: IndexedEndpointActionsForHostResponse
): Promise<DeleteIndexedEndpointActionsResponse> => {
  const response: DeleteIndexedEndpointActionsResponse = {
    endpointActionRequests: undefined,
    endpointActionResponses: undefined,
  };

  if (indexedData.endpointActions.length) {
    response.endpointActionRequests = (
      await esClient
        .deleteByQuery({
          index: `${indexedData.endpointActionsIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      action_id: indexedData.endpointActions.map(
                        (action) => action.EndpointAction.action_id
                      ),
                    },
                  },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise)
    ).body;
  }

  if (indexedData.endpointActionResponses) {
    response.endpointActionResponses = (
      await esClient
        .deleteByQuery({
          index: `${indexedData.endpointActionResponsesIndex}-*`,
          wait_for_completion: true,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      action_id: indexedData.endpointActionResponses.map(
                        (action) => action.EndpointAction.action_id
                      ),
                    },
                  },
                ],
              },
            },
          },
        })
        .catch(wrapErrorAndRejectPromise)
    ).body;
  }

  return response;
};
