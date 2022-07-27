/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  SavedObjectsUpdateResponse,
  SavedObject,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import {
  MonitorFields,
  EncryptedSyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
  SyntheticsMonitor,
  ConfigKey,
} from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { validateMonitor } from './monitor_validation';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  sendTelemetryEvents,
  formatTelemetryUpdateEvent,
} from '../telemetry/monitor_upgrade_sender';
import { formatSecrets, normalizeSecrets } from '../../synthetics_service/utils/secrets';
import type { UptimeServerSetup } from '../../legacy_uptime/lib/adapters/framework';

// Simplify return promise type and type it with runtime_types
export const editSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string(),
    }),
    body: schema.any(),
  },
  handler: async ({
    request,
    response,
    savedObjectsClient,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { encryptedSavedObjects, logger } = server;
    const encryptedSavedObjectsClient = encryptedSavedObjects.getClient();
    const monitor = request.body as SyntheticsMonitor;
    const { monitorId } = request.params;

    try {
      const previousMonitor: SavedObject<EncryptedSyntheticsMonitor> = await savedObjectsClient.get(
        syntheticsMonitorType,
        monitorId
      );

      /* Decrypting the previous monitor before editing ensures that all existing fields remain
       * on the object, even in flows where decryption does not take place, such as the enabled tab
       * on the monitor list table. We do not decrypt monitors in bulk for the monitor list table */
      const decryptedPreviousMonitor =
        await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
          syntheticsMonitor.name,
          monitorId,
          {
            namespace: previousMonitor.namespaces?.[0],
          }
        );
      const normalizedPreviousMonitor = normalizeSecrets(decryptedPreviousMonitor).attributes;

      const editedMonitor = {
        ...normalizedPreviousMonitor,
        ...monitor,
      };

      const validationResult = validateMonitor(editedMonitor as MonitorFields);

      if (!validationResult.valid) {
        const { reason: message, details, payload } = validationResult;
        return response.badRequest({ body: { message, attributes: { details, ...payload } } });
      }

      const monitorWithRevision = {
        ...editedMonitor,
        revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
      };
      const formattedMonitor = formatSecrets(monitorWithRevision);

      const editedMonitorSavedObject: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor> =
        await savedObjectsClient.update<MonitorFields>(
          syntheticsMonitorType,
          monitorId,
          monitor.type === 'browser' ? { ...formattedMonitor, urls: '' } : formattedMonitor
        );

      const errors = await syncEditedMonitor({
        server,
        editedMonitor,
        editedMonitorSavedObject,
        previousMonitor,
        decryptedPreviousMonitor,
        syntheticsMonitorClient,
        savedObjectsClient,
        request,
      });

      // Return service sync errors in OK response
      if (errors && errors.length > 0) {
        return response.ok({
          body: { message: 'error pushing monitor to the service', attributes: { errors } },
        });
      }

      return editedMonitorSavedObject;
    } catch (updateErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(updateErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }
      logger.error(updateErr);

      throw updateErr;
    }
  },
});

export const syncEditedMonitor = async ({
  editedMonitor,
  editedMonitorSavedObject,
  previousMonitor,
  decryptedPreviousMonitor,
  server,
  syntheticsMonitorClient,
  savedObjectsClient,
  request,
}: {
  editedMonitor: SyntheticsMonitor;
  editedMonitorSavedObject: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>;
  previousMonitor: SavedObject<EncryptedSyntheticsMonitor>;
  decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecrets>;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
}) => {
  try {
    const errors = await syntheticsMonitorClient.editMonitor(
      editedMonitor as MonitorFields,
      editedMonitorSavedObject.id,
      request
    );

    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryUpdateEvent(
        editedMonitorSavedObject,
        previousMonitor,
        server.kibanaVersion,
        Boolean((editedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        errors
      )
    );

    return errors;
  } catch (e) {
    server.logger.error(
      `Unable to update Synthetics monitor ${decryptedPreviousMonitor.attributes[ConfigKey.NAME]}`
    );
    await savedObjectsClient.update<MonitorFields>(
      syntheticsMonitorType,
      editedMonitorSavedObject.id,
      decryptedPreviousMonitor.attributes
    );

    throw e;
  }
};
