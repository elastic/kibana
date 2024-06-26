/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildCrowdstrikeRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const getTokenRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/oauth2/token'),
    method: 'POST',
    handler: getTokenHandler,
  };
};

const getTokenHandler: ExternalEdrServerEmulatorRouteHandlerMethod<{}> = async () => {
  return {
    access_token: 'testtoken',
    expires_in: 123,
    token_type: 'bearer',
    id_token: 'test',
    issued_token_type: 'test',
    refresh_token: 'test',
    scope: 'test',
  };
};
