/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mergeWith } from 'lodash';
import { schema } from '@kbn/config-schema';
import {
  SavedObjectsUpdateResponse,
  SavedObject,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';
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
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
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

    const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

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
          syntheticsMonitorType,
          monitorId,
          {
            namespace: previousMonitor.namespaces?.[0],
          }
        );
      const normalizedPreviousMonitor = normalizeSecrets(decryptedPreviousMonitor).attributes;

      const editedMonitor = mergeWith(normalizedPreviousMonitor, monitor, customizer);

      const validationResult = validateMonitor(editedMonitor as MonitorFields);

      if (!validationResult.valid || !validationResult.decodedMonitor) {
        const { reason: message, details, payload } = validationResult;
        return response.badRequest({ body: { message, attributes: { details, ...payload } } });
      }

      const monitorWithRevision = {
        ...validationResult.decodedMonitor,
        /* reset config hash to empty string. Ensures that the synthetics agent is able
         * to update project monitors on when next pushed after they are edited via the UI,
         * through the enable/disable monitor toggle */
        [ConfigKey.CONFIG_HASH]: '',
        revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
      };

      const { errors, editedMonitor: editedMonitorSavedObject } = await syncEditedMonitor({
        server,
        previousMonitor,
        decryptedPreviousMonitor,
        syntheticsMonitorClient,
        savedObjectsClient,
        request,
        normalizedMonitor: monitorWithRevision,
        spaceId,
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
  normalizedMonitor,
  previousMonitor,
  decryptedPreviousMonitor,
  server,
  syntheticsMonitorClient,
  savedObjectsClient,
  request,
  spaceId,
}: {
  normalizedMonitor: SyntheticsMonitor;
  previousMonitor: SavedObject<EncryptedSyntheticsMonitor>;
  decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecrets>;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  spaceId: string;
}) => {
  try {
    const monitorWithId = {
      ...normalizedMonitor,
      [ConfigKey.MONITOR_QUERY_ID]:
        normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || previousMonitor.id,
      [ConfigKey.CONFIG_ID]: previousMonitor.id,
    };
    const formattedMonitor = formatSecrets(monitorWithId);

    const editedSOPromise = savedObjectsClient.update<MonitorFields>(
      syntheticsMonitorType,
      previousMonitor.id,
      formattedMonitor
    );

    const allPrivateLocations = await getSyntheticsPrivateLocations(savedObjectsClient);

    const editSyncPromise = syntheticsMonitorClient.editMonitors(
      [
        {
          monitor: monitorWithId as MonitorFields,
          id: previousMonitor.id,
          previousMonitor,
          decryptedPreviousMonitor,
        },
      ],
      request,
      savedObjectsClient,
      allPrivateLocations,
      spaceId
    );

    const [editedMonitorSavedObject, errors] = await Promise.all([
      editedSOPromise,
      editSyncPromise,
    ]);

    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryUpdateEvent(
        editedMonitorSavedObject as SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>,
        previousMonitor,
        server.stackVersion,
        Boolean((normalizedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        errors
      )
    );

    return { errors, editedMonitor: editedMonitorSavedObject };
  } catch (e) {
    server.logger.error(
      `Unable to update Synthetics monitor ${decryptedPreviousMonitor.attributes[ConfigKey.NAME]}`
    );
    await savedObjectsClient.update<MonitorFields>(
      syntheticsMonitorType,
      previousMonitor.id,
      decryptedPreviousMonitor.attributes
    );

    throw e;
  }
};

// Ensure that METADATA is merged deeply, to protect AAD and prevent decryption errors
const customizer = (_: any, srcValue: any, key: string) => {
  if (key !== ConfigKey.METADATA) {
    return srcValue;
  }
};
