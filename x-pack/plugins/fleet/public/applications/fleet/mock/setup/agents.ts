/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fleetSetupRouteService, GetFleetStatusResponse } from '../../../../../common';
import { httpHandlerMockFactory, ResponseProvidersInterface } from '../http_handler_mock_factory';

export const agentsSetupResponseMock = (): GetFleetStatusResponse => {
  return {
    isReady: true,
    missing_requirements: [],
  };
};

export interface AgentsSetupResponseProvidersMock extends ResponseProvidersInterface {
  getAgentsSetup: (...args: any) => GetFleetStatusResponse;
}

export const agentsSetupApiMock = httpHandlerMockFactory<AgentsSetupResponseProvidersMock>([
  {
    id: 'getAgentsSetup',
    method: 'get',
    path: fleetSetupRouteService.getFleetSetupPath(),
    handler: agentsSetupResponseMock,
  },
]);
