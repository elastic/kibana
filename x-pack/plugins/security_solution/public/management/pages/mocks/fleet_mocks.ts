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
  AGENT_POLICY_API_ROUTES,
  appRoutesService,
  CheckPermissionsResponse,
  EPM_API_ROUTES,
  GetAgentPoliciesResponse,
  GetPackagesResponse,
} from '../../../../../fleet/common';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';

export type FleetGetPackageListHttpMockInterface = ResponseProvidersInterface<{
  packageList: () => GetPackagesResponse;
}>;
export const fleetGetPackageListHttpMock =
  httpHandlerMockFactory<FleetGetPackageListHttpMockInterface>([
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
  ]);
export type FleetGetAgentPolicyListHttpMockInterface = ResponseProvidersInterface<{
  agentPolicy: () => GetAgentPoliciesResponse;
}>;
export const fleetGetAgentPolicyListHttpMock =
  httpHandlerMockFactory<FleetGetAgentPolicyListHttpMockInterface>([
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
  ]);
export type FleetGetCheckPermissionsInterface = ResponseProvidersInterface<{
  checkPermissions: () => CheckPermissionsResponse;
}>;
export const fleetGetCheckPermissionsHttpMock =
  httpHandlerMockFactory<FleetGetCheckPermissionsInterface>([
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
  ]);
export type FleetApisHttpMockInterface = FleetGetPackageListHttpMockInterface &
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
