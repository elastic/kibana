/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObject } from '@kbn/core-saved-objects-server';
import {
  formatTelemetryDeleteEvent,
  sendTelemetryEvents,
} from '../../telemetry/monitor_upgrade_sender';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitorWithId,
} from '../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import { RouteContext } from '../../types';

export const deleteMonitorBulk = async ({
  monitors,
  routeContext,
}: {
  monitors: Array<SavedObject<SyntheticsMonitor | EncryptedSyntheticsMonitorAttributes>>;
  routeContext: RouteContext;
}) => {
  const { savedObjectsClient, server, spaceId, syntheticsMonitorClient } = routeContext;
  const { logger, telemetry, stackVersion } = server;

  try {
    const deleteSyncPromise = syntheticsMonitorClient.deleteMonitors(
      monitors.map((normalizedMonitor) => ({
        ...normalizedMonitor.attributes,
        id: normalizedMonitor.attributes[ConfigKey.MONITOR_QUERY_ID],
      })) as SyntheticsMonitorWithId[],
      savedObjectsClient,
      spaceId
    );

    const deletePromises = savedObjectsClient.bulkDelete(
      monitors.map((monitor) => ({ type: syntheticsMonitorType, id: monitor.id }))
    );

    const [errors, result] = await Promise.all([deleteSyncPromise, deletePromises]);

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

    return { errors, result };
  } catch (e) {
    throw e;
  }
};
