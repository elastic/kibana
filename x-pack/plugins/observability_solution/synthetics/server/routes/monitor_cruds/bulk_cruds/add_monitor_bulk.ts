/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import pMap from 'p-map';
import { SavedObjectsBulkResponse } from '@kbn/core-saved-objects-api-server';
import { v4 as uuidV4 } from 'uuid';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SavedObjectError } from '@kbn/core-saved-objects-common';
import { SyntheticsServerSetup } from '../../../types';
import { RouteContext } from '../../types';
import { formatTelemetryEvent, sendTelemetryEvents } from '../../telemetry/monitor_upgrade_sender';
import { formatSecrets } from '../../../synthetics_service/utils';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  ServiceLocationErrors,
  SyntheticsMonitor,
  type SyntheticsPrivateLocations,
} from '../../../../common/runtime_types';
import { DeleteMonitorAPI } from '../services/delete_monitor_api';

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

  const result = await soClient.bulkCreate<EncryptedSyntheticsMonitorAttributes>(newMonitors);
  return result.saved_objects;
};

type MonitorSavedObject = SavedObject<EncryptedSyntheticsMonitorAttributes>;

type CreatedMonitors =
  SavedObjectsBulkResponse<EncryptedSyntheticsMonitorAttributes>['saved_objects'];

export const syncNewMonitorBulk = async ({
  routeContext,
  normalizedMonitors,
  privateLocations,
  spaceId,
}: {
  routeContext: RouteContext;
  normalizedMonitors: SyntheticsMonitor[];
  privateLocations: SyntheticsPrivateLocations;
  spaceId: string;
}) => {
  const { server, savedObjectsClient, syntheticsMonitorClient } = routeContext;
  let newMonitors: CreatedMonitors | null = null;

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
    const [createdMonitors, [policiesResult, syncErrors]] = await Promise.all([
      createNewSavedObjectMonitorBulk({
        monitorsToCreate,
        soClient: savedObjectsClient,
      }),
      syntheticsMonitorClient.addMonitors(monitorsToCreate, privateLocations, spaceId),
    ]);

    let failedMonitors: FailedMonitorConfig[] = [];

    const { failed: failedPolicies } = policiesResult ?? {};

    newMonitors = createdMonitors;

    if (failedPolicies && failedPolicies?.length > 0 && newMonitors) {
      failedMonitors = await handlePrivateConfigErrors(routeContext, newMonitors, failedPolicies);
    }

    sendNewMonitorTelemetry(server, newMonitors, syncErrors);

    return { errors: syncErrors, newMonitors, failedMonitors };
  } catch (e) {
    await rollBackNewMonitorBulk(monitorsToCreate, routeContext);
    throw e;
  }
};

interface FailedMonitorConfig {
  monitor: MonitorSavedObject;
  error?: Error | SavedObjectError;
}

const handlePrivateConfigErrors = async (
  routeContext: RouteContext,
  createdMonitors: CreatedMonitors,
  failedPolicies: Array<{ packagePolicy: NewPackagePolicy; error?: Error | SavedObjectError }>
) => {
  const failedMonitors: FailedMonitorConfig[] = [];

  await pMap(failedPolicies, async ({ packagePolicy, error }) => {
    const { inputs } = packagePolicy;
    const enabledInput = inputs?.find((input) => input.enabled);
    const stream = enabledInput?.streams?.[0];
    const vars = stream?.vars;
    const monitorId = vars?.[ConfigKey.CONFIG_ID]?.value;
    const monitor = createdMonitors.find(
      (savedObject) => savedObject.attributes[ConfigKey.CONFIG_ID] === monitorId
    );
    if (monitor) {
      failedMonitors.push({ monitor, error });
      await deleteMonitorIfCreated({
        routeContext,
        newMonitorId: monitor.id,
      });
      createdMonitors.splice(createdMonitors.indexOf(monitor), 1);
    }
  });
  return failedMonitors;
};

const rollBackNewMonitorBulk = async (
  monitorsToCreate: Array<{ id: string; monitor: MonitorFields }>,
  routeContext: RouteContext
) => {
  const { server } = routeContext;
  try {
    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);
    await deleteMonitorAPI.execute({
      monitorIds: monitorsToCreate.map(({ id }) => id),
    });
  } catch (e) {
    // ignore errors here
    server.logger.error(e);
  }
};

const sendNewMonitorTelemetry = (
  server: SyntheticsServerSetup,
  monitors: Array<SavedObject<EncryptedSyntheticsMonitorAttributes>>,
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

export const deleteMonitorIfCreated = async ({
  newMonitorId,
  routeContext,
}: {
  routeContext: RouteContext;
  newMonitorId: string;
}) => {
  const { server, savedObjectsClient } = routeContext;
  try {
    const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
      syntheticsMonitorType,
      newMonitorId
    );
    if (encryptedMonitor) {
      const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);

      await deleteMonitorAPI.deleteMonitorBulk({
        monitors: [encryptedMonitor],
      });
    }
  } catch (e) {
    // ignore errors here
    server.logger.error(e);
  }
};
