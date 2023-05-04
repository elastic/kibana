/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SavedObjectsUpdateResponse,
  SavedObject,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import {
  MonitorFields,
  EncryptedSyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
  SyntheticsMonitor,
  ConfigKey,
  PrivateLocation,
} from '../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import {
  sendTelemetryEvents,
  formatTelemetryUpdateEvent,
} from '../../telemetry/monitor_upgrade_sender';
import type { UptimeServerSetup } from '../../../legacy_uptime/lib/adapters/framework';

// Simplify return promise type and type it with runtime_types

export const syncEditedMonitorBulk = async ({
  server,
  request,
  spaceId,
  monitorsToUpdate,
  savedObjectsClient,
  privateLocations,
  syntheticsMonitorClient,
}: {
  monitorsToUpdate: Array<{
    normalizedMonitor: SyntheticsMonitor;
    monitorWithRevision: SyntheticsMonitorWithSecrets;
    previousMonitor: SavedObject<EncryptedSyntheticsMonitor>;
    decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecrets>;
  }>;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  privateLocations: PrivateLocation[];
  spaceId: string;
}) => {
  let savedObjectsSuccessful = false;
  let syncSuccessful = false;

  try {
    async function updateSavedObjects() {
      try {
        const editedSOPromise = await savedObjectsClient.bulkUpdate<MonitorFields>(
          monitorsToUpdate.map(({ previousMonitor, monitorWithRevision }) => ({
            type: syntheticsMonitorType,
            id: previousMonitor.id,
            attributes: {
              ...monitorWithRevision,
              [ConfigKey.CONFIG_ID]: previousMonitor.id,
              [ConfigKey.MONITOR_QUERY_ID]:
                monitorWithRevision[ConfigKey.CUSTOM_HEARTBEAT_ID] || previousMonitor.id,
            },
          }))
        );
        savedObjectsSuccessful = true;
        return editedSOPromise;
      } catch (e) {
        savedObjectsSuccessful = false;
      }
    }

    async function syncUpdatedMonitors() {
      try {
        const editSyncPromise = await syntheticsMonitorClient.editMonitors(
          monitorsToUpdate.map(
            ({ normalizedMonitor, previousMonitor, decryptedPreviousMonitor }) => ({
              monitor: {
                ...(normalizedMonitor as MonitorFields),
                [ConfigKey.CONFIG_ID]: previousMonitor.id,
                [ConfigKey.MONITOR_QUERY_ID]:
                  normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || previousMonitor.id,
              },
              id: previousMonitor.id,
              previousMonitor,
              decryptedPreviousMonitor,
            })
          ),
          request,
          savedObjectsClient,
          privateLocations,
          spaceId
        );
        syncSuccessful = true;
        return editSyncPromise;
      } catch (e) {
        syncSuccessful = false;
      }
    }

    const [editedMonitorSavedObjects, errors] = await Promise.all([
      updateSavedObjects(),
      syncUpdatedMonitors(),
    ]);

    monitorsToUpdate.forEach(({ normalizedMonitor, previousMonitor }) => {
      const editedMonitorSavedObject = editedMonitorSavedObjects?.saved_objects.find(
        (obj) => obj.id === previousMonitor.id
      );

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
    });

    return { errors, editedMonitors: editedMonitorSavedObjects?.saved_objects };
  } catch (e) {
    server.logger.error(`Unable to update Synthetics monitors `);

    if (!syncSuccessful && savedObjectsSuccessful) {
      await savedObjectsClient.bulkUpdate<MonitorFields>(
        monitorsToUpdate.map(({ previousMonitor, decryptedPreviousMonitor }) => ({
          type: syntheticsMonitorType,
          id: previousMonitor.id,
          attributes: decryptedPreviousMonitor.attributes,
        }))
      );
    }

    throw e;
  }
};
