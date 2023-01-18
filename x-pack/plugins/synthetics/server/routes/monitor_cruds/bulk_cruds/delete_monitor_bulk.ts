/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { SavedObject } from '@kbn/core-saved-objects-common';
import {
  formatTelemetryDeleteEvent,
  sendTelemetryEvents,
} from '../../telemetry/monitor_upgrade_sender';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitor,
  SyntheticsMonitorWithId,
} from '../../../../common/runtime_types';
import { UptimeServerSetup } from '../../../legacy_uptime/lib/adapters';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';

export const deleteMonitorBulk = async ({
  savedObjectsClient,
  server,
  monitors,
  syntheticsMonitorClient,
  request,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  monitors: Array<SavedObject<SyntheticsMonitor | EncryptedSyntheticsMonitor>>;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  request: KibanaRequest;
}) => {
  const { logger, telemetry, stackVersion } = server;

  try {
    const { id: spaceId } = await server.spaces.spacesService.getActiveSpace(request);
    const deleteSyncPromise = syntheticsMonitorClient.deleteMonitors(
      monitors.map((normalizedMonitor) => ({
        ...normalizedMonitor.attributes,
        id: normalizedMonitor.attributes[ConfigKey.MONITOR_QUERY_ID],
      })) as SyntheticsMonitorWithId[],
      request,
      savedObjectsClient,
      spaceId
    );

    const deletePromises = savedObjectsClient.bulkDelete(
      monitors.map((monitor) => ({ type: syntheticsMonitorType, id: monitor.id }))
    );

    const [errors] = await Promise.all([deleteSyncPromise, deletePromises]);

    monitors.forEach((monitor) => {
      sendTelemetryEvents(
        logger,
        telemetry,
        formatTelemetryDeleteEvent(
          monitor,
          stackVersion,
          new Date().toISOString(),
          Boolean((monitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
          errors
        )
      );
    });

    return errors;
  } catch (e) {
    throw e;
  }
};
