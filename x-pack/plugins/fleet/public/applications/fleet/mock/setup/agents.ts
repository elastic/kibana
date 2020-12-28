/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fleetSetupRouteService, GetFleetStatusResponse } from '../../../../../common';
import { httpHandlerMockFactory } from '../http_handler_mock_factory';

export const agentsSetupMock = (): GetFleetStatusResponse => {
  return {
    isReady: true,
    missing_requirements: [],
  };
};

export const agentsSetupApiMock = httpHandlerMockFactory([
  {
    id: 'getAgentsSetup',
    method: 'get',
    path: fleetSetupRouteService.getFleetSetupPath(),
    handler: jest.fn(agentsSetupMock),
  },
]);
