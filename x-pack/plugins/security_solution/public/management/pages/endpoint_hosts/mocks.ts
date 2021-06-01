/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpHandlerMockFactory } from '../../../common/mock/endpoint/http_handler_mock_factory';
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
  HOST_METADATA_GET_API,
  HOST_METADATA_LIST_API,
} from '../../../../common/endpoint/constants';
import { AGENT_POLICY_API_ROUTES, GetAgentPoliciesResponse } from '../../../../../fleet/common';

export const endpointMetadataHttpMocks = httpHandlerMockFactory<{
  metadataList: () => HostResultList;
  metadataDetails: () => HostInfo;
}>([
  {
    id: 'metadataList',
    path: HOST_METADATA_LIST_API,
    method: 'post',
    handler: () => {
      const generator = new EndpointDocGenerator('seed');

      return {
        hosts: Array.from({ length: 10 }, () => generator.generateHostMetadata()),
        total: 10,
        request_page_size: 10,
        request_page_index: 0,
        query_strategy_version: MetadataQueryStrategyVersions.VERSION_2,
      };
    },
  },
  {
    id: 'metadataDetails',
    path: HOST_METADATA_GET_API,
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
]);

export const endpointPolicyResponseHttpMock = httpHandlerMockFactory<{
  policyResponse: () => HostPolicyResponse;
}>([
  {
    id: 'policyResponse',
    path: BASE_POLICY_RESPONSE_ROUTE,
    method: 'get',
    handler: () => {
      return new EndpointDocGenerator('seed').generatePolicyResponse();
    },
  },
]);

export const fleetApis = httpHandlerMockFactory<{
  agentPolicy: () => GetAgentPoliciesResponse;
}>([
  {
    id: 'agentPolicy',
    path: AGENT_POLICY_API_ROUTES.LIST_PATTERN,
    method: 'get',
    handler: () => {
      const generator = new EndpointDocGenerator('seed');

      return {
        items: [generator.generateAgentPolicy()],
        perPage: 10,
        total: 1,
        page: 1,
      };
    },
  },
]);
