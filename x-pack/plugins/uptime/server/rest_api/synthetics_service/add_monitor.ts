/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObject } from 'kibana/server';
import { MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { validateMonitor } from './monitor_validation';
import { sendTelemetryEvents, formatTelemetryEvent } from './telemetry/monitor_upgrade_sender';

export const addSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    body: schema.any(),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const monitor: SyntheticsMonitor = request.body as SyntheticsMonitor;

    const validationResult = validateMonitor(monitor as MonitorFields);

    if (!validationResult.valid) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const newMonitor: SavedObject<SyntheticsMonitor> =
      await savedObjectsClient.create<SyntheticsMonitor>(syntheticsMonitorType, {
        ...monitor,
        revision: 1,
      });

    const { syntheticsService } = server;

    const errors = await syntheticsService.pushConfigs(request, [
      {
        ...newMonitor.attributes,
        id: newMonitor.id,
        fields: {
          config_id: newMonitor.id,
        },
        fields_under_root: true,
      },
    ]);

    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryEvent({ monitor: newMonitor, errors, kibanaVersion: server.kibanaVersion })
    );

    if (errors && errors.length > 0) {
      return response.ok({
        body: { message: 'error pushing monitor to the service', attributes: { errors } },
      });
    }

    return response.ok({ body: newMonitor });
  },
});
