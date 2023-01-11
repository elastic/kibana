/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { MonitorFields } from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { formatHeartbeatRequest } from '../../synthetics_service/formatters/format_configs';
import { validateMonitor } from '../monitor_cruds/monitor_validation';

export const runOnceSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.RUN_ONCE_MONITOR + '/{monitorId}',
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

    const spaceId = server.spaces.spacesService.getSpaceId(request);

    if (!validationResult.valid || !validationResult.decodedMonitor) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const { syntheticsService } = syntheticsMonitorClient;

    const paramsBySpace = await syntheticsService.getSyntheticsParams({ spaceId });

    const errors = await syntheticsService.runOnceConfigs([
      formatHeartbeatRequest({
        // making it enabled, even if it's disabled in the UI
        monitor: { ...validationResult.decodedMonitor, enabled: true },
        monitorId,
        heartbeatId: monitorId,
        runOnce: true,
        testRunId: monitorId,
        params: paramsBySpace[spaceId],
      }),
    ]);

    if (errors) {
      return { errors };
    }

    return monitor;
  },
});
