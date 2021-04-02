/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseProvidersInterface } from '../http_handler_mock_factory';
import { httpHandlerMockFactory } from '../http_handler_mock_factory';
import type { PostIngestSetupResponse } from '../../../../../common';
import { setupRouteService } from '../../../../../common';

export const setupResponseMock = (): PostIngestSetupResponse => {
  return { isInitialized: true };
};

export type FleetSetupResponseProvidersMock = ResponseProvidersInterface<{
  fleetSetup: () => PostIngestSetupResponse;
}>;

export const fleetSetupApiMock = httpHandlerMockFactory<FleetSetupResponseProvidersMock>([
  {
    id: 'fleetSetup',
    method: 'post',
    path: setupRouteService.getSetupPath(),
    handler: setupResponseMock,
  },
]);
