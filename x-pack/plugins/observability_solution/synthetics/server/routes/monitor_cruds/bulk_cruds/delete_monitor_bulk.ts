/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { SavedObject } from '@kbn/core-saved-objects-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SyntheticsServerSetup } from '../../../types';
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
  server: SyntheticsServerSetup;
  monitors: Array<SavedObject<SyntheticsMonitor | EncryptedSyntheticsMonitorAttributes>>;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  request: KibanaRequest;
}) => {
  const { logger, telemetry, stackVersion } = server;

  try {
    const { id: spaceId } = (await server.spaces?.spacesService.getActiveSpace(request)) ?? {
      id: DEFAULT_SPACE_ID,
    };

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
