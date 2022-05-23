/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObject, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitor,
} from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { validateMonitor } from './monitor_validation';
import { sendTelemetryEvents, formatTelemetryEvent } from '../telemetry/monitor_upgrade_sender';
import { formatSecrets } from '../../synthetics_service/utils/secrets';

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

    let newMonitor: SavedObject<EncryptedSyntheticsMonitor> | null = null;

    try {
      newMonitor = await savedObjectsClient.create<EncryptedSyntheticsMonitor>(
        syntheticsMonitorType,
        formatSecrets({
          ...monitor,
          revision: 1,
        })
      );
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isForbiddenError(getErr)) {
        return response.forbidden({ body: getErr });
      }
    }

    if (!newMonitor) {
      return response.customError({
        body: { message: 'Unable to create monitor' },
        statusCode: 500,
      });
    }

    const { syntheticsService } = server;

    const errors = await syntheticsService.addConfig({
      ...monitor,
      id: newMonitor.id,
      fields: {
        config_id: newMonitor.id,
      },
      fields_under_root: true,
    });

    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryEvent({
        monitor: newMonitor,
        errors,
        isInlineScript: Boolean((monitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        kibanaVersion: server.kibanaVersion,
      })
    );

    if (errors && errors.length > 0) {
      return response.ok({
        body: {
          message: 'error pushing monitor to the service',
          attributes: { errors },
          id: newMonitor.id,
        },
      });
    }

    return response.ok({ body: newMonitor });
  },
});
