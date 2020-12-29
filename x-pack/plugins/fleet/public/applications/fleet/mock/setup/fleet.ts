/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpHandlerMockFactory } from '../http_handler_mock_factory';
import { PostIngestSetupResponse, setupRouteService } from '../../../../../common';

export const setupResponseMock = (): PostIngestSetupResponse => {
  return { isInitialized: true };
};

export interface FleetSetupResponseProvidersMock {
  fleetSetup: jest.MockedFunction<() => PostIngestSetupResponse>;
}

export const fleetSetupApiMock = httpHandlerMockFactory<FleetSetupResponseProvidersMock>([
  {
    id: 'fleetSetup',
    method: 'post',
    path: setupRouteService.getSetupPath(),
    handler: setupResponseMock,
  },
]);
