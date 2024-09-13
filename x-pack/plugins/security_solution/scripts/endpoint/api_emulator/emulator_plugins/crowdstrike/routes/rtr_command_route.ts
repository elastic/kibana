/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CrowdstrikeHostActionsParams } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import {
  buildCrowdstrikeRoutePath,
  TEST_AGENT_ID,
  TEST_CLOUD_REQUEST_ID,
  TEST_SESSION_ID,
} from './utils';
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

// @ts-expect-error - example of error response while executing cat command
const rtrCommandExampleError = async () => {
  return {
    meta: {
      query_time: 0.913513625,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout: '',
          stderr: 'cat: test.xt: No such file or directory',
          base_command: 'cat',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 0.912058582,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

// @ts-expect-error - invalid command
const rtrCommandInvalidCommandError = async () => {
  return {
    meta: {
      query_time: 0.101208469,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: '',
          complete: false,
          stdout: '',
          stderr: '',
          aid: TEST_AGENT_ID,
          errors: [
            {
              code: 40007,
              message: 'Command not found',
            },
          ],
          query_time: 0,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

// @ts-expect-error - invalid session
const rtrCommandInvalidSessionError = async () => {
  return {
    meta: {
      query_time: 0.02078217,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: '',
          complete: false,
          stdout: '',
          stderr: '',
          aid: TEST_AGENT_ID,
          errors: [
            {
              code: 50007,
              message: 'could not get session',
            },
          ],
          query_time: 0,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

const rtrCommandHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  CrowdstrikeHostActionsParams
> = async () => {
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
