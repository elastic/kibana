/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CrowdstrikeHostActionsParams } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { buildCrowdstrikeRoutePath, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const getRTRCommandDetailsRoute = (): EmulatorServerRouteDefinition => {
  return {
    // PARAMS /v1?cloud_request_id=test-cloud-request1&sequence_id=0
    path: buildCrowdstrikeRoutePath('/real-time-response/entities/command/v1'),
    method: 'GET',
    handler: getRTRCommandDetailsSuccessHandler,
  };
};

// @ts-expect-error - example of missing file error
const commandDetailsMissingCloudIdError = async () => {
  return {
    meta: {
      query_time: 0.000238205,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: [],
    errors: [
      {
        code: 400,
        message: 'cloud_request_id must be a uuid string',
      },
    ],
  };
};

const getRTRCommandDetailsSuccessHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  CrowdstrikeHostActionsParams
> = async () => {
  return {
    meta: {
      query_time: 0.307542055,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: [
      {
        session_id: TEST_SESSION_ID,
        task_id: 'xxx',
        complete: true,
        stdout:
          'archive\nbackup\nbin\nboot\ndev\necho\netc\nhome\nlib\nlost+found\nmedia\nmnt\nopt\nproc\nroot\nrun\nsbin\nsnap\nsrv\nstuff.exe\nsys\ntest.sh\ntestPush.exe\ntmp\nusr\nvar\n',
        stderr: '',
        base_command: 'ls',
      },
    ],
    errors: [],
  };
};
