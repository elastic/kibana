/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import {
  EncryptedSyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../../lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from './service_errors';
import {
  sendTelemetryEvents,
  formatTelemetryDeleteEvent,
} from './telemetry/monitor_upgrade_sender';
import { normalizeSecrets } from '../../lib/synthetics_service/utils/secrets';

export const deleteSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({
    request,
    response,
    savedObjectsClient,
    server: { encryptedSavedObjects, syntheticsService, logger, telemetry, kibanaVersion },
  }): Promise<any> => {
    const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();

    const { monitorId } = request.params;

    try {
      const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitor>(
        syntheticsMonitorType,
        monitorId
      );

      const monitor =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
          syntheticsMonitor.name,
          monitorId,
          {
            namespace: encryptedMonitor.namespaces?.[0],
          }
        );

      const normalizedMonitor = normalizeSecrets(monitor);

      await savedObjectsClient.delete(syntheticsMonitorType, monitorId);
      const errors = await syntheticsService.deleteConfigs([
        { ...normalizedMonitor.attributes, id: monitorId },
      ]);

      sendTelemetryEvents(
        logger,
        telemetry,
        formatTelemetryDeleteEvent(monitor, kibanaVersion, new Date().toISOString(), errors)
      );

      if (errors && errors.length > 0) {
        return response.ok({
          body: { message: 'error pushing monitor to the service', attributes: { errors } },
        });
      }

      return monitorId;
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});
