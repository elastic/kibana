/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  KibanaRequest,
} from '@kbn/core/server';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import {
  ConfigKey,
  MonitorFields,
  EncryptedSyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  sendTelemetryEvents,
  formatTelemetryDeleteEvent,
} from '../telemetry/monitor_upgrade_sender';
import { formatSecrets, normalizeSecrets } from '../../synthetics_service/utils/secrets';
import type { UptimeServerSetup } from '../../legacy_uptime/lib/adapters/framework';

export const deleteSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
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
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { monitorId } = request.params;

    try {
      const errors = await deleteMonitor({
        savedObjectsClient,
        server,
        monitorId,
        syntheticsMonitorClient,
        request,
      });

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
  syntheticsMonitorClient,
  request,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  monitorId: string;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  request: KibanaRequest;
}) => {
  const { logger, telemetry, kibanaVersion, encryptedSavedObjects } = server;
  const spaceId = server.spaces.spacesService.getSpaceId(request);

  const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();
  let normalizedMonitor;
  try {
    const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitor>(
      syntheticsMonitorType,
      monitorId
    );

    const monitor =
      await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
        syntheticsMonitorType,
        monitorId,
        {
          namespace: encryptedMonitor.namespaces?.[0],
        }
      );

    normalizedMonitor = normalizeSecrets(monitor);

    const deleteSyncPromise = syntheticsMonitorClient.deleteMonitors(
      [
        {
          ...normalizedMonitor.attributes,
          id:
            (normalizedMonitor.attributes as MonitorFields)[ConfigKey.CUSTOM_HEARTBEAT_ID] ||
            monitorId,
        },
      ],
      request,
      savedObjectsClient,
      spaceId
    );
    const deletePromise = savedObjectsClient.delete(syntheticsMonitorType, monitorId);

    const [errors] = await Promise.all([deleteSyncPromise, deletePromise]);

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
    if (normalizedMonitor) {
      await restoreDeletedMonitor({
        monitorId,
        normalizedMonitor: formatSecrets({
          ...normalizedMonitor.attributes,
        }),
        savedObjectsClient,
      });
    }
    throw e;
  }
};

const restoreDeletedMonitor = async ({
  monitorId,
  savedObjectsClient,
  normalizedMonitor,
}: {
  monitorId: string;
  normalizedMonitor: SyntheticsMonitorWithSecrets;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  try {
    await savedObjectsClient.get<EncryptedSyntheticsMonitor>(syntheticsMonitorType, monitorId);
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      await savedObjectsClient.create(syntheticsMonitorType, normalizedMonitor, {
        id: monitorId,
        overwrite: true,
      });
    }
  }
};
