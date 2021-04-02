/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetFleetStatusResponse } from '../../../../../common';
import { fleetSetupRouteService } from '../../../../../common';
import type { ResponseProvidersInterface } from '../http_handler_mock_factory';
import { httpHandlerMockFactory } from '../http_handler_mock_factory';

export const agentsSetupResponseMock = (): GetFleetStatusResponse => {
  return {
    isReady: true,
    missing_requirements: [],
  };
};

export type AgentsSetupResponseProvidersMock = ResponseProvidersInterface<{
  getAgentsSetup: () => GetFleetStatusResponse;
}>;

export const agentsSetupApiMock = httpHandlerMockFactory<AgentsSetupResponseProvidersMock>([
  {
    id: 'getAgentsSetup',
    method: 'get',
    path: fleetSetupRouteService.getFleetSetupPath(),
    handler: agentsSetupResponseMock,
  },
]);
