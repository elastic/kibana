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
  HostInfo,
  HostPolicyResponse,
  HostResultList,
  HostStatus,
  MetadataQueryStrategyVersions,
} from '../../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import {
  BASE_POLICY_RESPONSE_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '../../../../common/endpoint/constants';
import {
  AGENT_POLICY_API_ROUTES,
  EPM_API_ROUTES,
  GetAgentPoliciesResponse,
  GetPackagesResponse,
} from '../../../../../fleet/common';
import {
  PendingActionsHttpMockInterface,
  pendingActionsHttpMock,
} from '../../../common/lib/endpoint_pending_actions/mocks';

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
              query_strategy_version: MetadataQueryStrategyVersions.VERSION_2,
            };

            generator.updateCommonInfo();

            return endpoint;
          }),
          total: 10,
          request_page_size: 10,
          request_page_index: 0,
          query_strategy_version: MetadataQueryStrategyVersions.VERSION_2,
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
          query_strategy_version: MetadataQueryStrategyVersions.VERSION_2,
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

type FleetApisHttpMockInterface = ResponseProvidersInterface<{
  agentPolicy: () => GetAgentPoliciesResponse;
  packageList: () => GetPackagesResponse;
}>;
export const fleetApisHttpMock = httpHandlerMockFactory<FleetApisHttpMockInterface>([
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
      (agentPolicy.package_policies as string[]).push(endpointMetadata.Endpoint.policy.applied.id);

      return {
        items: [agentPolicy],
        perPage: 10,
        total: 1,
        page: 1,
      };
    },
  },
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

type EndpointPageHttpMockInterface = EndpointMetadataHttpMocksInterface &
  EndpointPolicyResponseHttpMockInterface &
  FleetApisHttpMockInterface &
  PendingActionsHttpMockInterface;
/**
 * HTTP Mocks that support the Endpoint List and Details page
 */
export const endpointPageHttpMock = composeHttpHandlerMocks<EndpointPageHttpMockInterface>([
  endpointMetadataHttpMocks,
  endpointPolicyResponseHttpMock,
  fleetApisHttpMock,
  pendingActionsHttpMock,
]);
