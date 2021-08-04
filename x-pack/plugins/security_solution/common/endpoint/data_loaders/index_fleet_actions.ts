/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { EndpointAction, HostMetadata } from '../types';
import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../../fleet/common';
import { FleetActionGenerator } from '../data_generators/fleet_action_generator';

const defaultFleetActionGenerator = new FleetActionGenerator();

/**
 * Indexes Fleet Actions for a given host
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
): Promise<void> => {
  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };
  const agentId = endpointHost.elastic.agent.id;
  const total = fleetActionGenerator.randomN(5);

  for (let i = 0; i < total; i++) {
    // create an action
    const action = fleetActionGenerator.generate({
      data: { comment: 'data generator: this host is bad' },
    });

    action.agents = [agentId];

    esClient.index(
      {
        index: AGENT_ACTIONS_INDEX,
        body: action,
      },
      ES_INDEX_OPTIONS
    );

    // Create an action response for the above
    const actionResponse = fleetActionGenerator.generateResponse({
      action_id: action.action_id,
      agent_id: agentId,
      action_data: action.data,
    });

    esClient.index(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        body: actionResponse,
      },
      ES_INDEX_OPTIONS
    );
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

      await esClient.index(
        {
          index: AGENT_ACTIONS_INDEX,
          body: action,
        },
        ES_INDEX_OPTIONS
      );
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
        esClient.index(
          {
            index: AGENT_ACTIONS_INDEX,
            body: action1,
          },
          ES_INDEX_OPTIONS
        ),
        esClient.index(
          {
            index: AGENT_ACTIONS_INDEX,
            body: action2,
          },
          ES_INDEX_OPTIONS
        ),
      ]);
    }
  }
};
