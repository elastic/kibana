/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClient } from '@kbn/test';
import type { RunContext } from '@kbn/dev-cli-runner';
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
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

export interface RuntimeServices {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
}

export const createRuntimeServices = ({
  log,
  flags: { kibana, elastic, username, password },
}: RunContext): RuntimeServices => {
  const kbnUrl = new URL(kibana as string);
  kbnUrl.username = username as string;
  kbnUrl.password = password as string;

  const esUrl = new URL(elastic as string);
  esUrl.username = username as string;
  esUrl.password = password as string;

  log.verbose(`Kibana URL: ${kbnUrl.href}`, `Elasticsearch URL: ${esUrl.href}`);

  const kbnClient = new KbnClient({ log, url: kbnUrl.href });
  const esClient = new Client({ node: esUrl.href });

  return {
    kbnClient,
    esClient,
    log,
  };
};

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
  action: ActionDetails
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

  // 30% of the time we generate an error
  if (fleetActionGenerator.randomFloat() < 0.3) {
    fleetResponse.action_response = {};
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
  action: ActionDetails
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

  // 30% of the time we generate an error
  if (endpointActionGenerator.randomFloat() < 0.3) {
    endpointResponse.error = {
      message: 'Endpoint encountered an error',
    };
  }

  await esClient.index({
    index: ENDPOINT_ACTION_RESPONSES_INDEX,
    body: endpointResponse,
    refresh: 'wait_for',
  });

  return endpointResponse;
};
