/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { SavedObjectError } from '@kbn/core-saved-objects-common';
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { RouteContext } from '../../types';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import { FailedPolicyUpdate } from '../../../synthetics_service/private_location/synthetics_private_location';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  HeartbeatConfig,
  MonitorFields,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../../common/runtime_types';
import {
  formatTelemetryUpdateEvent,
  sendTelemetryEvents,
} from '../../telemetry/monitor_upgrade_sender';

// Simplify return promise type and type it with runtime_types

interface MonitorConfigUpdate {
  normalizedMonitor: SyntheticsMonitor;
  monitorWithRevision: SyntheticsMonitorWithSecretsAttributes;
  previousMonitor: SavedObject<EncryptedSyntheticsMonitorAttributes>;
  decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
}

const updateConfigSavedObjects = async ({
  routeContext,
  monitorsToUpdate,
}: {
  routeContext: RouteContext;
  monitorsToUpdate: MonitorConfigUpdate[];
}) => {
  return await routeContext.savedObjectsClient.bulkUpdate<MonitorFields>(
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
};

async function syncUpdatedMonitors({
  spaceId,
  privateLocations,
  routeContext,
  monitorsToUpdate,
}: {
  privateLocations: PrivateLocationAttributes[];
  spaceId: string;
  routeContext: RouteContext;
  monitorsToUpdate: MonitorConfigUpdate[];
}) {
  const { syntheticsMonitorClient } = routeContext;

  return await syntheticsMonitorClient.editMonitors(
    monitorsToUpdate.map(({ normalizedMonitor, previousMonitor, decryptedPreviousMonitor }) => ({
      monitor: {
        ...(normalizedMonitor as MonitorFields),
        [ConfigKey.CONFIG_ID]: previousMonitor.id,
        [ConfigKey.MONITOR_QUERY_ID]:
          normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || previousMonitor.id,
      },
      id: previousMonitor.id,
      previousMonitor,
      decryptedPreviousMonitor,
    })),
    routeContext,
    privateLocations,
    spaceId
  );
}

export const syncEditedMonitorBulk = async ({
  routeContext,
  spaceId,
  monitorsToUpdate,
  privateLocations,
}: {
  monitorsToUpdate: MonitorConfigUpdate[];
  routeContext: RouteContext;
  privateLocations: PrivateLocationAttributes[];
  spaceId: string;
}) => {
  const { server } = routeContext;

  try {
    const [editedMonitorSavedObjects, editSyncResponse] = await Promise.all([
      updateConfigSavedObjects({ monitorsToUpdate, routeContext }),
      syncUpdatedMonitors({ monitorsToUpdate, routeContext, spaceId, privateLocations }),
    ]);

    const { failedPolicyUpdates, publicSyncErrors } = editSyncResponse;

    monitorsToUpdate.forEach(({ normalizedMonitor, previousMonitor }) => {
      const editedMonitorSavedObject = editedMonitorSavedObjects?.saved_objects.find(
        (obj) => obj.id === previousMonitor.id
      );

      sendTelemetryEvents(
        server.logger,
        server.telemetry,
        formatTelemetryUpdateEvent(
          editedMonitorSavedObject as SavedObjectsUpdateResponse<EncryptedSyntheticsMonitorAttributes>,
          previousMonitor,
          server.stackVersion,
          Boolean((normalizedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
          publicSyncErrors
        )
      );
    });

    const failedConfigs = await rollbackFailedUpdates({
      monitorsToUpdate,
      routeContext,
      failedPolicyUpdates,
    });

    return {
      failedConfigs,
      errors: publicSyncErrors,
      editedMonitors: editedMonitorSavedObjects?.saved_objects,
    };
  } catch (e) {
    server.logger.error(`Unable to update Synthetics monitors, ${e.message}`);
    await rollbackCompletely({ routeContext, monitorsToUpdate });
    throw e;
  }
};

export const rollbackCompletely = async ({
  routeContext,
  monitorsToUpdate,
}: {
  monitorsToUpdate: MonitorConfigUpdate[];
  routeContext: RouteContext;
}) => {
  const { savedObjectsClient, server } = routeContext;
  try {
    await savedObjectsClient.bulkUpdate<MonitorFields>(
      monitorsToUpdate.map(({ previousMonitor, decryptedPreviousMonitor }) => ({
        type: syntheticsMonitorType,
        id: previousMonitor.id,
        attributes: decryptedPreviousMonitor.attributes,
      }))
    );
  } catch (e) {
    server.logger.error(`Unable to rollback Synthetics monitors edit ${e.message} `);
  }
};

export const rollbackFailedUpdates = async ({
  routeContext,
  failedPolicyUpdates,
  monitorsToUpdate,
}: {
  monitorsToUpdate: Array<{
    previousMonitor: SavedObject<EncryptedSyntheticsMonitorAttributes>;
    decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
  }>;
  routeContext: RouteContext;
  failedPolicyUpdates?: FailedPolicyUpdate[];
}) => {
  if (!failedPolicyUpdates || failedPolicyUpdates.length === 0) {
    return;
  }
  const { server, savedObjectsClient } = routeContext;

  try {
    const failedConfigs: Record<
      string,
      { config: HeartbeatConfig; error?: Error | SavedObjectError }
    > = {};

    failedPolicyUpdates.forEach(({ config, error }) => {
      if (config && config[ConfigKey.CONFIG_ID]) {
        failedConfigs[config[ConfigKey.CONFIG_ID]] = {
          config,
          error,
        };
      }
    });

    const monitorsToRevert = monitorsToUpdate
      .filter(({ previousMonitor }) => {
        return failedConfigs[previousMonitor.id];
      })
      .map(({ previousMonitor, decryptedPreviousMonitor }) => ({
        type: syntheticsMonitorType,
        id: previousMonitor.id,
        attributes: decryptedPreviousMonitor.attributes,
      }));

    if (monitorsToRevert.length > 0) {
      await savedObjectsClient.bulkUpdate<MonitorFields>(monitorsToRevert);
    }
    return failedConfigs;
  } catch (e) {
    server.logger.error(`Unable to rollback Synthetics monitor failed updates, ${e.message} `);
  }
};
