/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeHttpHandlerMocks } from '../../../../common/mock/endpoint/http_handler_mock_factory';
import {
  fleetGetAgentPolicyListHttpMock,
  FleetGetAgentPolicyListHttpMockInterface,
  fleetGetEndpointPackagePolicyListHttpMock,
  FleetGetEndpointPackagePolicyListHttpMockInterface,
  trustedAppPostHttpMocks,
  TrustedAppPostHttpMocksInterface,
  trustedAppPutHttpMocks,
  TrustedAppPutHttpMocksInterface,
  trustedAppsGetListHttpMocks,
  TrustedAppsGetListHttpMocksInterface,
  trustedAppsGetOneHttpMocks,
  TrustedAppsGetOneHttpMocksInterface,
  trustedAppsPostCreateListHttpMock,
  TrustedAppsPostCreateListHttpMockInterface,
} from '../../mocks';

export type TrustedAppsPageHttpApiMocksInterface = TrustedAppsGetListHttpMocksInterface &
  TrustedAppsGetOneHttpMocksInterface &
  TrustedAppPutHttpMocksInterface &
  TrustedAppPostHttpMocksInterface &
  TrustedAppsPostCreateListHttpMockInterface &
  FleetGetEndpointPackagePolicyListHttpMockInterface &
  FleetGetAgentPolicyListHttpMockInterface;

/**
 * Provides all http API mocks to support the Trusted apps page
 */
export const trustedAppsPageHttpApiMocks =
  composeHttpHandlerMocks<TrustedAppsPageHttpApiMocksInterface>([
    trustedAppsGetListHttpMocks,
    trustedAppsGetOneHttpMocks,
    trustedAppPutHttpMocks,
    trustedAppPostHttpMocks,
    trustedAppsPostCreateListHttpMock,
    fleetGetEndpointPackagePolicyListHttpMock,
    fleetGetAgentPolicyListHttpMock,
  ]);
