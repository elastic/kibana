/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchOptionsWithPath } from '@kbn/core/public';
import { EndpointActionGenerator } from '../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  ACTION_DETAILS_ROUTE,
  ACTION_STATUS_ROUTE,
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  KILL_PROCESS_ROUTE,
} from '../../../common/endpoint/constants';
import {
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../common/mock/endpoint/http_handler_mock_factory';
import {
  ActionDetailsApiResponse,
  HostIsolationResponse,
  PendingActionsResponse,
  ActionDetails,
} from '../../../common/endpoint/types';

export type ResponseActionsHttpMocksInterface = ResponseProvidersInterface<{
  isolateHost: () => HostIsolationResponse;

  releaseHost: () => HostIsolationResponse;

  killProcess: () => ActionDetailsApiResponse;

  actionDetails: (options: HttpFetchOptionsWithPath) => ActionDetailsApiResponse;

  agentPendingActionsSummary: (options: HttpFetchOptionsWithPath) => PendingActionsResponse;
}>;

export const responseActionsHttpMocks = httpHandlerMockFactory<ResponseActionsHttpMocksInterface>([
  {
    id: 'isolateHost',
    path: ISOLATE_HOST_ROUTE,
    method: 'post',
    handler: (): HostIsolationResponse => {
      return { action: '1-2-3' };
    },
  },
  {
    id: 'releaseHost',
    path: UNISOLATE_HOST_ROUTE,
    method: 'post',
    handler: (): HostIsolationResponse => {
      return { action: '3-2-1' };
    },
  },
  {
    id: 'killProcess',
    path: KILL_PROCESS_ROUTE,
    method: 'post',
    handler: (): ActionDetailsApiResponse => {
      const generator = new EndpointActionGenerator('seed');
      const response = generator.generateActionDetails() as ActionDetails;
      return { data: response };
    },
  },
  {
    id: 'actionDetails',
    path: ACTION_DETAILS_ROUTE,
    method: 'get',
    handler: ({ path }): ActionDetailsApiResponse => {
      const response = new EndpointActionGenerator('seed').generateActionDetails();

      // use the ID of the action in the response
      response.id = path.substring(path.lastIndexOf('/') + 1) || response.id;

      return { data: response };
    },
  },
  {
    id: 'agentPendingActionsSummary',
    path: ACTION_STATUS_ROUTE,
    method: 'get',
    handler: ({ query }): PendingActionsResponse => {
      const generator = new EndpointActionGenerator('seed');

      return {
        data: (query as { agent_ids: string[] }).agent_ids.map((id) =>
          generator.generateAgentPendingActionsSummary({ agent_id: id })
        ),
      };
    },
  },
]);
