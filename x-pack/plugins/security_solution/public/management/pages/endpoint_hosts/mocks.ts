/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  composeHttpHandlerMocks,
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../../common/mock/endpoint/http_handler_mock_factory';
import {
  ActivityLog,
  HostInfo,
  HostPolicyResponse,
  HostResultList,
  HostStatus,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { FleetActionGenerator } from '../../../../common/endpoint/data_generators/fleet_action_generator';
import {
  BASE_POLICY_RESPONSE_ROUTE,
  ENDPOINT_ACTION_LOG_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '../../../../common/endpoint/constants';
import {
  AGENT_POLICY_API_ROUTES,
  appRoutesService,
  CheckPermissionsResponse,
  EPM_API_ROUTES,
  GetAgentPoliciesResponse,
  GetPackagesResponse,
} from '../../../../../fleet/common';
import {
  PendingActionsHttpMockInterface,
  pendingActionsHttpMock,
} from '../../../common/lib/endpoint_pending_actions/mocks';
import { TRANSFORM_STATS_URL } from '../../../../common/constants';
import { TransformStatsResponse, TRANSFORM_STATE } from './types';

type EndpointMetadataHttpMocksInterface = ResponseProvidersInterface<{
  metadataList: () => HostResultList;
  metadataDetails: () => HostInfo;
}>;
export const endpointMetadataHttpMocks = httpHandlerMockFactory<EndpointMetadataHttpMocksInterface>(
  [
    {
      id: 'metadataList',
      path: HOST_METADATA_LIST_ROUTE,
      method: 'post',
      handler: () => {
        const generator = new EndpointDocGenerator('seed');

        return {
          hosts: Array.from({ length: 10 }, () => {
            const endpoint = {
              metadata: generator.generateHostMetadata(),
              host_status: HostStatus.UNHEALTHY,
            };

            generator.updateCommonInfo();

            return endpoint;
          }),
          total: 10,
          request_page_size: 10,
          request_page_index: 0,
        };
      },
    },
    {
      id: 'metadataDetails',
      path: HOST_METADATA_GET_ROUTE,
      method: 'get',
      handler: () => {
        const generator = new EndpointDocGenerator('seed');

        return {
          metadata: generator.generateHostMetadata(),
          host_status: HostStatus.UNHEALTHY,
        };
      },
    },
  ]
);

type EndpointPolicyResponseHttpMockInterface = ResponseProvidersInterface<{
  policyResponse: () => HostPolicyResponse;
}>;
export const endpointPolicyResponseHttpMock = httpHandlerMockFactory<EndpointPolicyResponseHttpMockInterface>(
  [
    {
      id: 'policyResponse',
      path: BASE_POLICY_RESPONSE_ROUTE,
      method: 'get',
      handler: () => {
        return new EndpointDocGenerator('seed').generatePolicyResponse();
      },
    },
  ]
);

type EndpointActivityLogHttpMockInterface = ResponseProvidersInterface<{
  activityLogResponse: () => ActivityLog;
}>;
export const endpointActivityLogHttpMock = httpHandlerMockFactory<EndpointActivityLogHttpMockInterface>(
  [
    {
      id: 'activityLogResponse',
      path: ENDPOINT_ACTION_LOG_ROUTE,
      method: 'get',
      handler: () => {
        const generator = new EndpointDocGenerator('seed');
        const endpointMetadata = generator.generateHostMetadata();
        const fleetActionGenerator = new FleetActionGenerator('seed');
        const actionData = fleetActionGenerator.generate({
          agents: [endpointMetadata.agent.id],
        });
        const responseData = fleetActionGenerator.generateResponse({
          agent_id: endpointMetadata.agent.id,
        });

        return {
          body: {
            page: 1,
            pageSize: 50,
            data: [
              {
                type: 'response',
                item: {
                  id: '',
                  data: responseData,
                },
              },
              {
                type: 'action',
                item: {
                  id: '',
                  data: actionData,
                },
              },
            ],
          },
        };
      },
    },
  ]
);

export type FleetGetPackageListHttpMockInterface = ResponseProvidersInterface<{
  packageList: () => GetPackagesResponse;
}>;
export const fleetGetPackageListHttpMock = httpHandlerMockFactory<FleetGetPackageListHttpMockInterface>(
  [
    {
      id: 'packageList',
      method: 'get',
      path: EPM_API_ROUTES.LIST_PATTERN,
      handler() {
        const generator = new EndpointDocGenerator('seed');

        return {
          response: [generator.generateEpmPackage()],
        };
      },
    },
  ]
);

export type FleetGetAgentPolicyListHttpMockInterface = ResponseProvidersInterface<{
  agentPolicy: () => GetAgentPoliciesResponse;
}>;
export const fleetGetAgentPolicyListHttpMock = httpHandlerMockFactory<FleetGetAgentPolicyListHttpMockInterface>(
  [
    {
      id: 'agentPolicy',
      path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
      method: 'get',
      handler: () => {
        const generator = new EndpointDocGenerator('seed');
        const endpointMetadata = generator.generateHostMetadata();
        const agentPolicy = generator.generateAgentPolicy();

        // Make sure that the Agent policy returned from the API has the Integration Policy ID that
        // the endpoint metadata is using. This is needed especially when testing the Endpoint Details
        // flyout where certain actions might be disabled if we know the endpoint integration policy no
        // longer exists.
        (agentPolicy.package_policies as string[]).push(
          endpointMetadata.Endpoint.policy.applied.id
        );

        return {
          items: [agentPolicy],
          perPage: 10,
          total: 1,
          page: 1,
        };
      },
    },
  ]
);

export type FleetGetCheckPermissionsInterface = ResponseProvidersInterface<{
  checkPermissions: () => CheckPermissionsResponse;
}>;

export const fleetGetCheckPermissionsHttpMock = httpHandlerMockFactory<FleetGetCheckPermissionsInterface>(
  [
    {
      id: 'checkPermissions',
      path: appRoutesService.getCheckPermissionsPath(),
      method: 'get',
      handler: () => {
        return {
          error: undefined,
          success: true,
        };
      },
    },
  ]
);

type FleetApisHttpMockInterface = FleetGetPackageListHttpMockInterface &
  FleetGetAgentPolicyListHttpMockInterface &
  FleetGetCheckPermissionsInterface;
/**
 * Mocks all Fleet apis needed to render the Endpoint List/Details pages
 */
export const fleetApisHttpMock = composeHttpHandlerMocks<FleetApisHttpMockInterface>([
  fleetGetPackageListHttpMock,
  fleetGetAgentPolicyListHttpMock,
  fleetGetCheckPermissionsHttpMock,
]);

type TransformHttpMocksInterface = ResponseProvidersInterface<{
  metadataTransformStats: () => TransformStatsResponse;
}>;
export const failedTransformStateMock = {
  count: 1,
  transforms: [
    {
      state: TRANSFORM_STATE.FAILED,
    },
  ],
};
export const transformsHttpMocks = httpHandlerMockFactory<TransformHttpMocksInterface>([
  {
    id: 'metadataTransformStats',
    path: TRANSFORM_STATS_URL,
    method: 'get',
    handler: () => failedTransformStateMock,
  },
]);

type EndpointPageHttpMockInterface = EndpointMetadataHttpMocksInterface &
  EndpointPolicyResponseHttpMockInterface &
  EndpointActivityLogHttpMockInterface &
  FleetApisHttpMockInterface &
  PendingActionsHttpMockInterface &
  TransformHttpMocksInterface;
/**
 * HTTP Mocks that support the Endpoint List and Details page
 */
export const endpointPageHttpMock = composeHttpHandlerMocks<EndpointPageHttpMockInterface>([
  endpointMetadataHttpMocks,
  endpointPolicyResponseHttpMock,
  endpointActivityLogHttpMock,
  fleetApisHttpMock,
  pendingActionsHttpMock,
  transformsHttpMocks,
]);
