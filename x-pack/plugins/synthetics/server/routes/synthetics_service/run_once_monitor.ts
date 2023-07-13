/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SyntheticsRestApiRouteFactory } from '../types';
import { MonitorFields } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { validateMonitor } from '../monitor_cruds/monitor_validation';

export const runOnceSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.RUN_ONCE_MONITOR + '/{monitorId}',
  validate: {
    body: schema.any(),
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, response, server, syntheticsMonitorClient }): Promise<any> => {
    const monitor = request.body as MonitorFields;
    const { monitorId } = request.params;

    const validationResult = validateMonitor(monitor);

    const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    if (!validationResult.valid || !validationResult.decodedMonitor) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const { syntheticsService } = syntheticsMonitorClient;

    const paramsBySpace = await syntheticsService.getSyntheticsParams({ spaceId });

    const errors = await syntheticsService.runOnceConfigs({
      // making it enabled, even if it's disabled in the UI
      monitor: { ...validationResult.decodedMonitor, enabled: true },
      configId: monitorId,
      heartbeatId: monitorId,
      runOnce: true,
      testRunId: monitorId,
      params: paramsBySpace[spaceId],
    });

    if (errors) {
      return { errors };
    }

    return monitor;
  },
});
