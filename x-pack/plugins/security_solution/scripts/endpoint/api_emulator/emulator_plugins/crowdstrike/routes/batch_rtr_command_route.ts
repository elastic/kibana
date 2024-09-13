/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CrowdstrikeHostActionsParams } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { buildCrowdstrikeRoutePath, TEST_AGENT_ID, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const batchRTRCommandRoute = (): EmulatorServerRouteDefinition => {
  return {
    // we use `combined` api - which returns just one complete response, otherwise it would be coming in batches
    path: buildCrowdstrikeRoutePath('/real-time-response/combined/batch-command/v1'),
    method: 'POST',
    handler: batchRTRCommandSuccessHandler,
  };
};

// @ts-expect-error - example of missing file error
const batchCommandResponseWithError = async () => {
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

// @ts-expect-error - example of error response
const batchCommandResponseInvalidCommandError = async () => {
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

// @ts-expect-error - example of error response
const batchCommandInvalidSessionError = async () => {
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
// @ts-expect-error - example of error response
const batchCommandCommandIsNotValidError = async () => {
  return {
    meta: {
      query_time: 0.122372386,
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
              code: 40006,
              message: 'Command is not valid',
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

const batchRTRCommandSuccessHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  CrowdstrikeHostActionsParams
> = async () => {
  return {
    meta: {
      query_time: 0.888750872,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout:
            'bin\nbin.usr-is-merged\nboot\ndev\netc\nhome\nlib\nlib.usr-is-merged\nlost+found\nmedia\nmnt\nopt\nproc\nroot\nrun\nsbin\nsbin.usr-is-merged\nsnap\nsrv\nsys\ntmp\nusr\nvar',
          stderr: '',
          base_command: 'ls',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 0.887764377,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};
