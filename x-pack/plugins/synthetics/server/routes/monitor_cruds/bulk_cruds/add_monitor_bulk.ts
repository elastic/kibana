/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, KibanaRequest, SavedObject } from '@kbn/core/server';
import pMap from 'p-map';
import { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import { v4 as uuidV4 } from 'uuid';
import { formatTelemetryEvent, sendTelemetryEvents } from '../../telemetry/monitor_upgrade_sender';
import { deleteMonitor } from '../delete_monitor';
import { UptimeServerSetup } from '../../../legacy_uptime/lib/adapters';
import { formatSecrets } from '../../../synthetics_service/utils';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorFields,
  PrivateLocation,
  ServiceLocationErrors,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

export const createNewSavedObjectMonitorBulk = async ({
  soClient,
  monitorsToCreate,
}: {
  soClient: SavedObjectsClientContract;
  monitorsToCreate: Array<{ id: string; monitor: MonitorFields }>;
}) => {
  const newMonitors = monitorsToCreate.map(({ id, monitor }) => ({
    id,
    type: syntheticsMonitorType,
    attributes: formatSecrets({
      ...monitor,
      [ConfigKey.MONITOR_QUERY_ID]: monitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
      [ConfigKey.CONFIG_ID]: id,
      revision: 1,
    }),
  }));

  return await soClient.bulkCreate<EncryptedSyntheticsMonitor>(newMonitors);
};

export const syncNewMonitorBulk = async ({
  normalizedMonitors,
  server,
  syntheticsMonitorClient,
  soClient,
  request,
  privateLocations,
  spaceId,
}: {
  normalizedMonitors: SyntheticsMonitor[];
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  soClient: SavedObjectsClientContract;
  request: KibanaRequest;
  privateLocations: PrivateLocation[];
  spaceId: string;
}) => {
  let newMonitors: SavedObjectsBulkResponse<EncryptedSyntheticsMonitor> | null = null;
  const monitorsToCreate = normalizedMonitors.map((monitor) => {
    const monitorSavedObjectId = uuidV4();
    return {
      id: monitorSavedObjectId,
      monitor: {
        ...monitor,
        [ConfigKey.CONFIG_ID]: monitorSavedObjectId,
        [ConfigKey.MONITOR_QUERY_ID]:
          monitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || monitorSavedObjectId,
      } as MonitorFields,
    };
  });

  try {
    const [createdMonitors, { syncErrors }] = await Promise.all([
      createNewSavedObjectMonitorBulk({
        monitorsToCreate,
        soClient,
      }),
      syntheticsMonitorClient.addMonitors(
        monitorsToCreate,
        request,
        soClient,
        privateLocations,
        spaceId
      ),
    ]);

    newMonitors = createdMonitors;

    sendNewMonitorTelemetry(server, newMonitors.saved_objects, syncErrors);

    return { errors: syncErrors, newMonitors: newMonitors.saved_objects };
  } catch (e) {
    await rollBackNewMonitorBulk(
      monitorsToCreate,
      server,
      soClient,
      syntheticsMonitorClient,
      request
    );

    throw e;
  }
};

const rollBackNewMonitorBulk = async (
  monitorsToCreate: Array<{ id: string; monitor: MonitorFields }>,
  server: UptimeServerSetup,
  soClient: SavedObjectsClientContract,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  request: KibanaRequest
) => {
  try {
    await pMap(
      monitorsToCreate,
      async (monitor) =>
        deleteMonitor({
          server,
          request,
          savedObjectsClient: soClient,
          monitorId: monitor.id,
          syntheticsMonitorClient,
        }),
      { concurrency: 100 }
    );
  } catch (e) {
    // ignore errors here
    server.logger.error(e);
  }
};

const sendNewMonitorTelemetry = (
  server: UptimeServerSetup,
  monitors: Array<SavedObject<EncryptedSyntheticsMonitor>>,
  errors?: ServiceLocationErrors | null
) => {
  for (const monitor of monitors) {
    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryEvent({
        errors,
        monitor,
        isInlineScript: Boolean((monitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        stackVersion: server.stackVersion,
      })
    );
  }
};
