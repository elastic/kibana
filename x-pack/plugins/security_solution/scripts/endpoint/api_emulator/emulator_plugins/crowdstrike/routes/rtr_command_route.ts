/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildCrowdstrikeRoutePath, TEST_CLOUD_REQUEST_ID, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const rtrCommandRoute = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/real-time-response/entities/command/v1'),
    method: 'POST',
    handler: rtrCommandHandler,
  };
};
// {
//     "base_command": "ls",
//   "command_string": "ls",
//   "session_id": TEST_SESSION_ID,
//   "device_id": TEST_AGENT_ID,
//   "persist": true
// }

// @ts-expect-error - invalid command
const rtrCommandInvalidCommandError = async () => {
  return {
    meta: {
      query_time: 0.049229938,
      powered_by: 'empower-api',
      trace_id: '9a58f783-08f8-4245-8a4e-70811d60e2c8',
    },
    resources: [],
    errors: [
      {
        code: 40007,
        message: 'Command not found',
      },
    ],
  };
};

// @ts-expect-error - invalid session
const rtrCommandInvalidSessionError = async () => {
  return {
    meta: {
      query_time: 0.018424436,
      powered_by: 'empower-api',
      trace_id: '3212d22f-0655-4dce-8685-43f1ed1494ee',
    },
    resources: [],
    errors: [
      {
        code: 40002,
        message: 'Could not find existing session',
      },
    ],
  };
};

const rtrCommandHandler: ExternalEdrServerEmulatorRouteHandlerMethod<{}, {}> = async () => {
  return {
    meta: {
      query_time: 0.274908106,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: [
      {
        session_id: TEST_SESSION_ID,
        cloud_request_id: TEST_CLOUD_REQUEST_ID,
        queued_command_offline: false,
      },
    ],
    errors: null,
  };
};
