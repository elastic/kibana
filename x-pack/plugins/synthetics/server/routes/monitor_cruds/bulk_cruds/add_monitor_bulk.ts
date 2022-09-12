/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { UptimeServerSetup } from '../../../legacy_uptime/lib/adapters';
import { formatSecrets } from '../../../synthetics_service/utils';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import {
  EncryptedSyntheticsMonitor,
  MonitorFields,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

export const createNewSavedObjectMonitorBulk = async ({
  savedObjectsClient,
  normalizedMonitors,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  normalizedMonitors: SyntheticsMonitor[];
}) => {
  const newMonitors = normalizedMonitors.map((normalizedMonitor) => ({
    type: syntheticsMonitorType,
    attributes: formatSecrets({
      ...normalizedMonitor,
      revision: 1,
    }),
  }));

  return await savedObjectsClient.bulkCreate<EncryptedSyntheticsMonitor>(newMonitors);
};

export const syncNewMonitorBulk = async ({
  monitors,
  normalizedMonitors,
  server,
  syntheticsMonitorClient,
  savedObjectsClient,
  request,
}: {
  monitors: SyntheticsMonitor[];
  normalizedMonitors: SyntheticsMonitor[];
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
}) => {
  try {
    const newMonitors = await createNewSavedObjectMonitorBulk({
      normalizedMonitors,
      savedObjectsClient,
    });

    const syncMonitors: Array<{ monitor: MonitorFields; id: string }> = [];
    for (let i = 0; i < normalizedMonitors.length; i++) {
      const monitor = normalizedMonitors[i];

      const newMonitor = newMonitors.saved_objects[i];

      syncMonitors.push({ id: newMonitor.id, monitor: monitor as MonitorFields });
    }

    const syncErrors = await syntheticsMonitorClient.addMonitorBulk(
      syncMonitors,
      request,
      savedObjectsClient
    );

    // monitorSavedObject = monitorSavedObjectN;
    //
    // sendTelemetryEvents(
    //   server.logger,
    //   server.telemetry,
    //   formatTelemetryEvent({
    //     errors: syncErrors,
    //     monitor: monitorSavedObject,
    //     isInlineScript: Boolean((monitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
    //     kibanaVersion: server.kibanaVersion,
    //   })
    // );

    return { errors: syncErrors, newMonitors };
  } catch (e) {
    // if (monitorSavedObject?.id) {
    //   await deleteMonitor({
    //     savedObjectsClient,
    //     server,
    //     monitorId: newMonitorId,
    //     syntheticsMonitorClient,
    //     request,
    //   });
    // }

    throw e;
  }
};
