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

export const hostActionsRouteDefinition = (): EmulatorServerRouteDefinition => {
  return {
    path: buildCrowdstrikeRoutePath('/devices/entities/devices-actions/v2'),
    method: 'POST',
    handler: hostActionsHandler,
  };
};

const hostActionsHandler: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  CrowdstrikeHostActionsParams
> = async () => {
  return {
    resources: [
      {
        id: 'test',
        path: 'test',
      },
    ],

    meta: {
      query_time: 123,
      powered_by: 'test',
      trace_id: 'test',
    },
    errors: [],
  };
};
