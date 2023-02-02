/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseProvidersInterface } from '../../../common/mock/endpoint/http_handler_mock_factory';
import {
  composeHttpHandlerMocks,
  httpHandlerMockFactory,
} from '../../../common/mock/endpoint/http_handler_mock_factory';
import type {
  HostInfo,
  HostPolicyResponse,
  MetadataListResponse,
} from '../../../../common/endpoint/types';
import { HostStatus } from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import {
  BASE_POLICY_RESPONSE_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
  METADATA_TRANSFORMS_STATUS_ROUTE,
} from '../../../../common/endpoint/constants';
import type { PendingActionsHttpMockInterface } from '../../../common/lib/endpoint_pending_actions/mocks';
import { pendingActionsHttpMock } from '../../../common/lib/endpoint_pending_actions/mocks';
import { TRANSFORM_STATES } from '../../../../common/constants';
import type { TransformStatsResponse } from './types';
import type {
  FleetGetAgentPolicyListHttpMockInterface,
  FleetGetAgentStatusHttpMockInterface,
  FleetGetCheckPermissionsInterface,
  FleetGetEndpointPackagePolicyHttpMockInterface,
  FleetGetPackageHttpMockInterface,
  FleetGetPackageListHttpMockInterface,
} from '../../mocks';
import {
  fleetGetAgentPolicyListHttpMock,
  fleetGetCheckPermissionsHttpMock,
  fleetGetPackageListHttpMock,
  fleetGetPackageHttpMock,
  fleetBulkGetPackagePoliciesListHttpMock,
  fleetBulkGetAgentPolicyListHttpMock,
  fleetGetPackagePoliciesListHttpMock,
} from '../../mocks';

type EndpointMetadataHttpMocksInterface = ResponseProvidersInterface<{
  metadataList: () => MetadataListResponse;
  metadataDetails: () => HostInfo;
}>;
export const endpointMetadataHttpMocks = httpHandlerMockFactory<EndpointMetadataHttpMocksInterface>(
  [
    {
      id: 'metadataList',
      path: HOST_METADATA_LIST_ROUTE,
      method: 'get',
      handler: () => {
        const generator = new EndpointDocGenerator('seed');

        return {
          data: Array.from({ length: 10 }, () => {
            const endpoint = {
              metadata: generator.generateHostMetadata(),
              host_status: HostStatus.UNHEALTHY,
            };

            generator.updateCommonInfo();

            return endpoint;
          }),
          total: 10,
          page: 0,
          pageSize: 10,
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
export const endpointPolicyResponseHttpMock =
  httpHandlerMockFactory<EndpointPolicyResponseHttpMockInterface>([
    {
      id: 'policyResponse',
      path: BASE_POLICY_RESPONSE_ROUTE,
      method: 'get',
      handler: () => {
        return new EndpointDocGenerator('seed').generatePolicyResponse();
      },
    },
  ]);

type TransformHttpMocksInterface = ResponseProvidersInterface<{
  metadataTransformStats: () => TransformStatsResponse;
}>;
export const failedTransformStateMock = {
  count: 1,
  transforms: [
    {
      state: TRANSFORM_STATES.FAILED,
    },
  ],
};
export const transformsHttpMocks = httpHandlerMockFactory<TransformHttpMocksInterface>([
  {
    id: 'metadataTransformStats',
    path: METADATA_TRANSFORMS_STATUS_ROUTE,
    method: 'get',
    handler: () => failedTransformStateMock,
  },
]);

export type EndpointListFleetApisHttpMockInterface = FleetGetPackageListHttpMockInterface &
  FleetGetPackageHttpMockInterface &
  FleetGetAgentPolicyListHttpMockInterface &
  FleetGetCheckPermissionsInterface &
  FleetGetAgentStatusHttpMockInterface &
  FleetGetEndpointPackagePolicyHttpMockInterface;
/**
 * Mocks all Fleet apis
 */
export const endpointListFleetApisHttpMock =
  composeHttpHandlerMocks<EndpointListFleetApisHttpMockInterface>([
    fleetGetPackageListHttpMock,
    fleetGetPackageHttpMock,
    fleetGetAgentPolicyListHttpMock,
    fleetBulkGetPackagePoliciesListHttpMock,
    fleetBulkGetAgentPolicyListHttpMock,
    fleetGetPackagePoliciesListHttpMock,
    fleetGetCheckPermissionsHttpMock,
  ]);
type EndpointPageHttpMockInterface = EndpointMetadataHttpMocksInterface &
  EndpointPolicyResponseHttpMockInterface &
  EndpointListFleetApisHttpMockInterface &
  PendingActionsHttpMockInterface &
  TransformHttpMocksInterface;
/**
 * HTTP Mocks that support the Endpoint List and Details page
 */
export const endpointPageHttpMock = composeHttpHandlerMocks<EndpointPageHttpMockInterface>([
  endpointMetadataHttpMocks,
  endpointPolicyResponseHttpMock,
  endpointListFleetApisHttpMock,
  pendingActionsHttpMock,
  transformsHttpMocks,
]);
