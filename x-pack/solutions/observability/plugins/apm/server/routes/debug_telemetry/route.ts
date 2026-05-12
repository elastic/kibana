/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { routeDefinitions, type DebugTelemetryResponse } from '@kbn/apm-api-shared';
import type { APMTelemetry } from '@kbn/apm-types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { APM_TELEMETRY_TASK_NAME } from '../../lib/apm_telemetry';
import {
  APM_TELEMETRY_SAVED_OBJECT_ID,
  APM_TELEMETRY_SAVED_OBJECT_TYPE,
} from '../../../common/apm_saved_object_constants';

export const debugTelemetryRoute = createApmServerRoute({
  endpoint: routeDefinitions.debugTelemetry.debugTelemetry.endpoint,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  handler: async (resources): Promise<DebugTelemetryResponse> => {
    const { plugins, context } = resources;
    const coreContext = await context.core;
    const taskManagerStart = await plugins.taskManager?.start();
    const savedObjectsClient = coreContext.savedObjects.client;

    await taskManagerStart?.runSoon?.(APM_TELEMETRY_TASK_NAME);

    const apmTelemetryObject = await savedObjectsClient.get(
      APM_TELEMETRY_SAVED_OBJECT_TYPE,
      APM_TELEMETRY_SAVED_OBJECT_ID
    );

    return apmTelemetryObject.attributes as APMTelemetry;
  },
});
