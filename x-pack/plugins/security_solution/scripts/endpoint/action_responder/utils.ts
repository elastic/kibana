/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';
import { Client } from '@elastic/elasticsearch';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { FleetActionGenerator } from '../../../common/endpoint/data_generators/fleet_action_generator';
import {
  ENDPOINT_ACTION_RESPONSES_INDEX,
  ENDPOINTS_ACTION_LIST_ROUTE,
} from '../../../common/endpoint/constants';
import {
  ActionDetails,
  ActionListApiResponse,
  EndpointActionData,
  EndpointActionResponse,
  LogsEndpointActionResponse,
} from '../../../common/endpoint/types';
import { EndpointActionListRequestQuery } from '../../../common/endpoint/schema/actions';
import { EndpointActionGenerator } from '../../../common/endpoint/data_generators/endpoint_action_generator';

const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

export const fleetActionGenerator = new FleetActionGenerator();

export const endpointActionGenerator = new EndpointActionGenerator();

export const sleep = (ms: number = 1000) => new Promise((r) => setTimeout(r, ms));

export const fetchEndpointActionList = async (
  kbn: KbnClient,
  options: EndpointActionListRequestQuery = {}
): Promise<ActionListApiResponse> => {
  return (
    await kbn.request<ActionListApiResponse>({
      method: 'GET',
      path: ENDPOINTS_ACTION_LIST_ROUTE,
      query: options,
    })
  ).data;
};

export const sendFleetActionResponse = async (
  esClient: Client,
  action: ActionDetails,
  { state }: { state?: 'success' | 'failure' } = {}
): Promise<EndpointActionResponse> => {
  const fleetResponse = fleetActionGenerator.generateResponse({
    action_id: action.id,
    agent_id: action.agents[0],
    action_response: {
      endpoint: {
        ack: true,
      },
    },
  });

  // 20% of the time we generate an error
  if (state === 'failure' || (!state && fleetActionGenerator.randomFloat() < 0.2)) {
    fleetResponse.action_response = {};
    fleetResponse.error = 'Agent failed to deliver message to endpoint due to unknown error';
  } else {
    // show it as success (generator currently always generates a `error`, so delete it)
    delete fleetResponse.error;
  }

  await esClient.index(
    {
      index: AGENT_ACTIONS_RESULTS_INDEX,
      body: fleetResponse,
      refresh: 'wait_for',
    },
    ES_INDEX_OPTIONS
  );

  return fleetResponse;
};

export const sendEndpointActionResponse = async (
  esClient: Client,
  action: ActionDetails,
  { state }: { state?: 'success' | 'failure' } = {}
): Promise<LogsEndpointActionResponse> => {
  // FIXME:PT Generate command specific responses

  const endpointResponse = endpointActionGenerator.generateResponse({
    agent: { id: action.agents[0] },
    EndpointActions: {
      action_id: action.id,
      data: {
        command: action.command as EndpointActionData['command'],
        comment: '',
      },
      started_at: action.startedAt,
    },
  });

  // 20% of the time we generate an error
  if (state === 'failure' || (state !== 'success' && endpointActionGenerator.randomFloat() < 0.2)) {
    endpointResponse.error = {
      message: 'Endpoint encountered an error and was unable to apply action to host',
    };
  }

  await esClient.index({
    index: ENDPOINT_ACTION_RESPONSES_INDEX,
    body: endpointResponse,
    refresh: 'wait_for',
  });

  return endpointResponse;
};
