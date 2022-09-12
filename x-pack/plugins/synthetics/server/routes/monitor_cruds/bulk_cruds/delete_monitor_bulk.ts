/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { ConfigKey, MonitorFields, SyntheticsMonitor } from '../../../../common/runtime_types';
import { UptimeServerSetup } from '../../../legacy_uptime/lib/adapters';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';

export const deleteMonitorBulk = async ({
  savedObjectsClient,
  server,
  monitorIds,
  syntheticsMonitorClient,
  request,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  monitorIds: string[];
  syntheticsMonitorClient: SyntheticsMonitorClient;
  request: KibanaRequest;
}) => {
  try {
    const encryptedMonitors = await savedObjectsClient.bulkGet<SyntheticsMonitor>(
      monitorIds.map((id) => ({ id, type: syntheticsMonitorType }))
    );

    const monitors = encryptedMonitors.saved_objects;

    const deleteSyncPromise = syntheticsMonitorClient.deleteMonitorBulk(
      monitors.map((normalizedMonitor) => ({
        ...normalizedMonitor.attributes,
        id:
          (normalizedMonitor.attributes as MonitorFields)[ConfigKey.CUSTOM_HEARTBEAT_ID] ||
          normalizedMonitor.id,
      })),
      request,
      savedObjectsClient
    );
    const deletePromises = monitors.map((monitor) =>
      savedObjectsClient.delete(syntheticsMonitorType, monitor.id)
    );

    const [errors] = await Promise.all([deleteSyncPromise, ...deletePromises]);

    return errors;
  } catch (e) {
    throw e;
  }
};
