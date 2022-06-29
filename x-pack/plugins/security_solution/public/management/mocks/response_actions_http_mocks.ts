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
  GET_RUNNING_PROCESSES_ROUTE,
  ENDPOINTS_ACTION_LIST_ROUTE,
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
  ActionListApiResponse,
  HostIsolationResponse,
  PendingActionsResponse,
  RunningProcessesEntry,
  ActionDetails,
} from '../../../common/endpoint/types';

export type ResponseActionsHttpMocksInterface = ResponseProvidersInterface<{
  isolateHost: () => HostIsolationResponse;

  releaseHost: () => HostIsolationResponse;

  killProcess: () => ActionDetailsApiResponse;

  actionDetails: (options: HttpFetchOptionsWithPath) => ActionDetailsApiResponse;

  actionList: (options: HttpFetchOptionsWithPath) => ActionListApiResponse;

  agentPendingActionsSummary: (options: HttpFetchOptionsWithPath) => PendingActionsResponse;

  runningProcesses: (
    options: HttpFetchOptionsWithPath
  ) => ActionDetailsApiResponse<RunningProcessesEntry>;
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
    id: 'actionList',
    path: ENDPOINTS_ACTION_LIST_ROUTE,
    method: 'get',
    handler: (): ActionListApiResponse => {
      const response = new EndpointActionGenerator('seed').generateActionDetails();

      return {
        elasticAgentIds: ['agent-a'],
        commands: ['isolate'],
        page: 0,
        pageSize: 10,
        startDate: 'now-10d',
        endDate: 'now',
        data: [response],
        userIds: ['elastic'],
        total: 1,
      };
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
  {
    id: 'runningProcesses',
    path: GET_RUNNING_PROCESSES_ROUTE,
    method: 'post',
    handler: (): ActionDetailsApiResponse<RunningProcessesEntry> => {
      const generator = new EndpointActionGenerator('seed');
      const response = generator.generateActionDetails({
        outputs: {
          '1': {
            type: 'json',
            content: {
              entries: generator.randomResponseActionRunningProcesses(3),
            },
          },
        },
      }) as ActionDetails<RunningProcessesEntry>;

      return { data: response };
    },
  },
]);
