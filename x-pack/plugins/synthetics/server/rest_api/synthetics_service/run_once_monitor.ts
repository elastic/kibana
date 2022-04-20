/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { MonitorFields } from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { validateMonitor } from './monitor_validation';

export const runOnceSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.RUN_ONCE_MONITOR + '/{monitorId}',
  validate: {
    body: schema.any(),
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, response, server }): Promise<any> => {
    const monitor = request.body as MonitorFields;
    const { monitorId } = request.params;

    const validationResult = validateMonitor(monitor);

    if (!validationResult.valid) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const { syntheticsService } = server;

    const errors = await syntheticsService.runOnceConfigs([
      {
        ...monitor,
        id: monitorId,
        fields_under_root: true,
        fields: { run_once: true, config_id: monitorId },
      },
    ]);

    if (errors) {
      return { errors };
    }

    return monitor;
  },
});
