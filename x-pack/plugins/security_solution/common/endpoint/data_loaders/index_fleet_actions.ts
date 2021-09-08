/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/api/types';
import { EndpointAction, EndpointActionResponse, HostMetadata } from '../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../fleet/common';
import { FleetActionGenerator } from '../data_generators/fleet_action_generator';
import { wrapErrorAndRejectPromise } from './utils';

const defaultFleetActionGenerator = new FleetActionGenerator();

export interface IndexedFleetActionsForHostResponse {
  actions: EndpointAction[];
  actionResponses: EndpointActionResponse[];
  actionsIndex: string;
  responsesIndex: string;
}

/**
 * Indexes a randome number of Endpoint (via Fleet) Actions for a given host
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 *
 * @param esClient
 * @param endpointHost
 * @param [fleetActionGenerator]
 */
export const indexFleetActionsForHost = async (
  esClient: Client,
  endpointHost: HostMetadata,
  fleetActionGenerator: FleetActionGenerator = defaultFleetActionGenerator
): Promise<IndexedFleetActionsForHostResponse> => {
  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };
  const agentId = endpointHost.elastic.agent.id;
  const total = fleetActionGenerator.randomN(5);
  const response: IndexedFleetActionsForHostResponse = {
    actions: [],
    actionResponses: [],
    actionsIndex: AGENT_ACTIONS_INDEX,
    responsesIndex: AGENT_ACTIONS_RESULTS_INDEX,
  };

  for (let i = 0; i < total; i++) {
    // create an action
    const action = fleetActionGenerator.generate({
      data: { comment: 'data generator: this host is bad' },
    });

    action.agents = [agentId];

    esClient
      .index(
        {
          index: AGENT_ACTIONS_INDEX,
          body: action,
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    // Create an action response for the above
    const actionResponse = fleetActionGenerator.generateResponse({
      action_id: action.action_id,
      agent_id: agentId,
      action_data: action.data,
    });

    esClient
      .index(
        {
          index: AGENT_ACTIONS_RESULTS_INDEX,
          body: actionResponse,
        },
        ES_INDEX_OPTIONS
      )
      .catch(wrapErrorAndRejectPromise);

    response.actions.push(action);
    response.actionResponses.push(actionResponse);
  }

  // Add edge cases (maybe)
  if (fleetActionGenerator.randomFloat() < 0.3) {
    const randomFloat = fleetActionGenerator.randomFloat();

    // 60% of the time just add either an Isolate -OR- an UnIsolate action
    if (randomFloat < 0.6) {
      let action: EndpointAction;

      if (randomFloat < 0.3) {
        // add a pending isolation
        action = fleetActionGenerator.generateIsolateAction({
          '@timestamp': new Date().toISOString(),
        });
      } else {
        // add a pending UN-isolation
        action = fleetActionGenerator.generateUnIsolateAction({
          '@timestamp': new Date().toISOString(),
        });
      }

      action.agents = [agentId];

      await esClient
        .index(
          {
            index: AGENT_ACTIONS_INDEX,
            body: action,
          },
          ES_INDEX_OPTIONS
        )
        .catch(wrapErrorAndRejectPromise);

      response.actions.push(action);
    } else {
      // Else (40% of the time) add a pending isolate AND pending un-isolate
      const action1 = fleetActionGenerator.generateIsolateAction({
        '@timestamp': new Date().toISOString(),
      });
      const action2 = fleetActionGenerator.generateUnIsolateAction({
        '@timestamp': new Date().toISOString(),
      });

      action1.agents = [agentId];
      action2.agents = [agentId];

      await Promise.all([
        esClient
          .index(
            {
              index: AGENT_ACTIONS_INDEX,
              body: action1,
            },
            ES_INDEX_OPTIONS
          )
          .catch(wrapErrorAndRejectPromise),
        esClient
          .index(
            {
              index: AGENT_ACTIONS_INDEX,
              body: action2,
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

export interface DeleteIndexedFleetActionsResponse {
  actions: DeleteByQueryResponse | undefined;
  responses: DeleteByQueryResponse | undefined;
}

export const deleteIndexedFleetActions = async (
  esClient: Client,
  indexedData: IndexedFleetActionsForHostResponse
): Promise<DeleteIndexedFleetActionsResponse> => {
  const response: DeleteIndexedFleetActionsResponse = {
    actions: undefined,
    responses: undefined,
  };

  if (indexedData.actions.length) {
    response.actions = (
      await esClient
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
        .catch(wrapErrorAndRejectPromise)
    ).body;
  }

  if (indexedData.actionResponses) {
    response.responses = (
      await esClient
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
        .catch(wrapErrorAndRejectPromise)
    ).body;
  }

  return response;
};
