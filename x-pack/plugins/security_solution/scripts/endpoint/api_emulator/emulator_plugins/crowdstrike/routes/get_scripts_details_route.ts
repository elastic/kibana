/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CrowdstrikeHostActionsParams } from '@kbn/stack-connectors-plugin/common/crowdstrike/types';
import { buildCrowdstrikeRoutePath } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const getCustomScriptsDetailsRoute = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/real-time-response/entities/scripts/v1'),
    method: 'GET',
    handler: getCustomScriptsDetailsSuccessHandler,
  };
};

// @ts-expect-error - example of missing file error
const getScriptsIdEmptyResponse = async () => {
  return {
    meta: {
      query_time: 0.025758121,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: [],
  };
};

const getCustomScriptsDetailsSuccessHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  CrowdstrikeHostActionsParams
> = async () => {
  return {
    meta: {
      query_time: 0.531831172,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    resources: [
      {
        id: 'test-id-1',
        name: 'AnyDesk Remediation',
        file_type: 'script',
        platform: ['windows'],
        size: 1979,
        content: 'echo "AnyDesk Remediation"',
        created_by: 'testuser@test.com',
        created_by_uuid: '34d10-a0f7e5dc98a8',
        created_timestamp: '2023-08-01T05:20:10.695182885Z',
        modified_by: 'testuser@test.com',
        modified_timestamp: '2023-08-01T05:20:10.695183074Z',
        sha256: 'test58f74e15e56815d71b29450f077df2f6070630184b9d',
        permission_type: 'public',
        run_attempt_count: 67,
        run_success_count: 0,
        write_access: true,
      },
      {
        id: 'test-id-2',
        name: 'Gather AnyDesk Artifacts',
        file_type: 'script',
        platform: ['windows'],
        size: 1184,
        content: 'echo Gather Anydesk Artifacts',
        created_by: 'testuser@test.com',
        created_by_uuid: '34d0610-a0f7e5dc98a8',
        created_timestamp: '2023-08-17T07:08:00.839412392Z',
        modified_by: 'testuser@test.com',
        modified_timestamp: '2023-08-17T07:08:00.839412727Z',
        sha256: 'teste8dfbb7cfb782c11484b47d336a93fdae80cffa77039c5',
        permission_type: 'public',
        run_attempt_count: 4,
        run_success_count: 0,
        write_access: true,
      },
    ],
  };
};
