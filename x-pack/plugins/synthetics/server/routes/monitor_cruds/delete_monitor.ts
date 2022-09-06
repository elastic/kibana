/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  ConfigKey,
  MonitorFields,
  EncryptedSyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  sendTelemetryEvents,
  formatTelemetryDeleteEvent,
} from '../telemetry/monitor_upgrade_sender';
import { normalizeSecrets } from '../../synthetics_service/utils/secrets';
import type { UptimeServerSetup } from '../../legacy_uptime/lib/adapters/framework';

export const deleteSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const { monitorId } = request.params;

    try {
      const errors = await deleteMonitor({ savedObjectsClient, server, monitorId });

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

export const deleteMonitor = async ({
  savedObjectsClient,
  server,
  monitorId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  monitorId: string;
}) => {
  const { syntheticsService, logger, telemetry, kibanaVersion, encryptedSavedObjects } = server;
  const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();
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
      {
        ...normalizedMonitor.attributes,
        id:
          (normalizedMonitor.attributes as MonitorFields)[ConfigKey.CUSTOM_HEARTBEAT_ID] ||
          monitorId,
      },
    ]);

    sendTelemetryEvents(
      logger,
      telemetry,
      formatTelemetryDeleteEvent(
        monitor,
        kibanaVersion,
        new Date().toISOString(),
        Boolean((normalizedMonitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        errors
      )
    );

    return errors;
  } catch (e) {
    throw e;
  }
};
