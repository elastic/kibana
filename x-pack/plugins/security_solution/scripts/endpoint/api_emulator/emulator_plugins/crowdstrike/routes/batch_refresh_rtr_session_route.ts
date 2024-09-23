/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildCrowdstrikeRoutePath, TEST_AGENT_ID, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const batchRTRRefreshSessionRoute = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/real-time-response/combined/batch-refresh-session/v1'),
    method: 'POST',
    handler: batchRTRRefreshSessionHandler,
  };
};

// @ts-expect-error - example of error response
const batchRTRRefreshSessionInvalidSessionError = async () => {
  return {
    meta: {
      query_time: 0.001031577,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: {},
    errors: [
      {
        code: 400,
        message: 'no hosts in this batch session',
      },
    ],
  };
};

const batchRTRRefreshSessionHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 0.068379923,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: {
      [TEST_AGENT_ID]: {
        aid: TEST_AGENT_ID,
        session_id: TEST_SESSION_ID,
        errors: [],
      },
    },
    errors: [],
  };
};
