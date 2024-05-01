/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSentinelOneRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const getAgentsRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildSentinelOneRoutePath('/agents'),
    method: 'GET',
    handler: agentsRouteHandler,
  };
};

const agentsRouteHandler: ExternalEdrServerEmulatorRouteHandlerMethod = async (request) => {
  return { message: 'Live. But not implemented!' };
};
