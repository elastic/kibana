/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCrowdstrikeRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';
import {
  createCrowdstrikeAgentDetailsMock,
  createCrowdstrikeGetAgentsApiResponseMock,
} from '../mocks';

export const getAgentDetailsRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/devices/entities/devices/v2'),
    method: 'GET',
    handler: getAgentDetailsHandler,
  };
};

const getAgentDetailsHandler: ExternalEdrServerEmulatorRouteHandlerMethod<{}> = async () => {
  return createCrowdstrikeGetAgentsApiResponseMock([createCrowdstrikeAgentDetailsMock({})]);
};
