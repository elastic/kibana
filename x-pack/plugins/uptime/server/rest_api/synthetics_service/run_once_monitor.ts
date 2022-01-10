/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { validateMonitor } from './monitor_validation';

export const runOnceSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.RUN_ONCE_MONITOR,
  validate: {
    body: schema.any(),
  },
  handler: async ({ request, response, server }): Promise<any> => {
    const monitor: SyntheticsMonitor = request.body as SyntheticsMonitor;

    const validationResult = validateMonitor(monitor as MonitorFields);

    if (!validationResult.valid) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const { syntheticsService } = server;

    const errors = await syntheticsService.runOnceConfigs(request, [
      { ...monitor, fields_under_root: true, fields: { run_once: true, config_id: monitor.id } },
    ]);

    if (errors) {
      return errors;
    }

    return monitor;
  },
});
