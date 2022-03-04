/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeHttpHandlerMocks } from '../../../../common/mock/endpoint/http_handler_mock_factory';
import {
  GetTrustedAppsListResponse,
  PostTrustedAppCreateResponse,
} from '../../../../../common/endpoint/types';
import { createSampleTrustedApp, createSampleTrustedApps } from '../../trusted_apps/test_utils';
import {
  PolicyDetailsArtifactsPageListLocationParams,
  PolicyDetailsArtifactsPageLocation,
} from '../types';
import {
  fleetGetAgentStatusHttpMock,
  FleetGetAgentStatusHttpMockInterface,
  fleetGetEndpointPackagePolicyHttpMock,
  FleetGetEndpointPackagePolicyHttpMockInterface,
  fleetGetEndpointPackagePolicyListHttpMock,
  FleetGetEndpointPackagePolicyListHttpMockInterface,
  trustedAppsGetListHttpMocks,
  TrustedAppsGetListHttpMocksInterface,
  trustedAppPutHttpMocks,
  TrustedAppPutHttpMocksInterface,
  trustedAppsGetOneHttpMocks,
  TrustedAppsGetOneHttpMocksInterface,
  fleetGetAgentPolicyListHttpMock,
  FleetGetAgentPolicyListHttpMockInterface,
  trustedAppsPostCreateListHttpMock,
  TrustedAppsPostCreateListHttpMockInterface,
} from '../../mocks';

export const getMockListResponse: () => GetTrustedAppsListResponse = () => ({
  data: createSampleTrustedApps({}),
  per_page: 100,
  page: 1,
  total: 100,
});

export const getMockPolicyDetailsArtifactsPageLocationUrlParams = (
  overrides: Partial<PolicyDetailsArtifactsPageLocation> = {}
): PolicyDetailsArtifactsPageLocation => {
  return {
    page_index: 0,
    page_size: 10,
    filter: '',
    show: undefined,
    ...overrides,
  };
};

export const getMockPolicyDetailsArtifactListUrlParams = (
  overrides: Partial<PolicyDetailsArtifactsPageListLocationParams> = {}
): PolicyDetailsArtifactsPageListLocationParams => {
  return {
    page_index: 0,
    page_size: 10,
    filter: '',
    ...overrides,
  };
};

export const getMockCreateResponse: () => PostTrustedAppCreateResponse = () =>
  createSampleTrustedApp(1) as unknown as unknown as PostTrustedAppCreateResponse;

export const getAPIError = () => ({
  statusCode: 500,
  error: 'Internal Server Error',
  message: 'Something is not right',
});

export type PolicyDetailsPageAllApiHttpMocksInterface =
  FleetGetEndpointPackagePolicyHttpMockInterface &
    FleetGetAgentStatusHttpMockInterface &
    FleetGetEndpointPackagePolicyListHttpMockInterface &
    FleetGetAgentPolicyListHttpMockInterface &
    TrustedAppsGetListHttpMocksInterface &
    TrustedAppPutHttpMocksInterface &
    TrustedAppsGetOneHttpMocksInterface &
    TrustedAppsPostCreateListHttpMockInterface;
export const policyDetailsPageAllApiHttpMocks =
  composeHttpHandlerMocks<PolicyDetailsPageAllApiHttpMocksInterface>([
    fleetGetEndpointPackagePolicyHttpMock,
    fleetGetAgentStatusHttpMock,
    fleetGetEndpointPackagePolicyListHttpMock,
    fleetGetAgentPolicyListHttpMock,
    trustedAppsGetListHttpMocks,
    trustedAppPutHttpMocks,
    trustedAppsGetOneHttpMocks,
    trustedAppsPostCreateListHttpMock,
  ]);
