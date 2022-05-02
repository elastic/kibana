/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import { schema } from '@kbn/config-schema';
import {
  SavedObjectsUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { UMServerLibs } from '../../lib/lib';
import {
  BrowserFields,
  ConfigKey,
  MonitorFields,
  SyntheticsMonitorWithSecrets,
  EncryptedSyntheticsMonitor,
  ServiceLocationErrors,
  PushBrowserMonitor,
  Locations,
} from '../../../common/runtime_types';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../../lib/saved_objects/synthetics_monitor';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { getServiceLocations } from '../../lib/synthetics_service/get_service_locations';
import { normalizePushedMonitor } from '../../lib/synthetics_service/normalizers/browser';
import { formatSecrets, normalizeSecrets } from '../../lib/synthetics_service/utils/secrets';
import { UptimeServerSetup } from '../../lib/adapters/framework';
import { syncNewMonitor } from './add_monitor';
import { syncEditedMonitor } from './edit_monitor';

export const addPublicSyntheticsMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PUSH,
  validate: {
    body: schema.any(),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const monitors = (request.body?.monitors as PushBrowserMonitor[]) || [];
    const locations: Locations = (await getServiceLocations(server)).locations;
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();
    const createdMonitors: string[] = [];
    const updatedMonitors: string[] = [];
    const failedMonitors: string[] = [];

    await Promise.all(
      monitors.map((monitor) =>
        configurePushMonitors({
          savedObjectsClient,
          encryptedSavedObjectsClient,
          locations,
          monitor,
          createdMonitors,
          updatedMonitors,
          failedMonitors,
          server,
        })
      )
    );

    return response.ok({
      body: {
        createdMonitors,
        failedMonitors,
        updatedMonitors,
      },
    });
  },
});

const getExistingMonitor = async (
  savedObjectsClient: SavedObjectsClientContract,
  id: string
): Promise<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> => {
  const { saved_objects: savedObjects } = await savedObjectsClient.find<EncryptedSyntheticsMonitor>(
    {
      type: syntheticsMonitorType,
      perPage: 1,
      filter: `${syntheticsMonitorType}.attributes.${ConfigKey.CUSTOM_ID}: ${id}`,
    }
  );
  return savedObjects[0];
};

const updateMonitor = async (
  savedObjectsClient: SavedObjectsClientContract,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitor>,
  normalizedMonitor: BrowserFields,
  server: UptimeServerSetup
): Promise<{
  editedMonitor: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>;
  errors: ServiceLocationErrors;
}> => {
  const decryptedPreviousMonitor =
    await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
      syntheticsMonitor.name,
      previousMonitor.id,
      {
        namespace: previousMonitor.namespaces?.[0],
      }
    );
  const {
    attributes: { [ConfigKey.REVISION]: _, ...normalizedPreviousMonitorAttributes },
  } = normalizeSecrets(decryptedPreviousMonitor);
  const hasMonitorBeenEdited = !isEqual(normalizedMonitor, normalizedPreviousMonitorAttributes);
  const monitorWithRevision = formatSecrets({
    ...normalizedMonitor,
    revision: hasMonitorBeenEdited
      ? (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1
      : previousMonitor.attributes[ConfigKey.REVISION],
  });
  const editedMonitor: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor> =
    await savedObjectsClient.update<MonitorFields>(syntheticsMonitorType, previousMonitor.id, {
      ...monitorWithRevision,
      urls: '',
    });

  if (hasMonitorBeenEdited) {
    syncEditedMonitor({
      editedMonitor: normalizedMonitor,
      editedMonitorSavedObject: editedMonitor,
      previousMonitor,
      server,
    });
  }

  return { editedMonitor, errors: [] };
};

const configurePushMonitors = async ({
  savedObjectsClient,
  encryptedSavedObjectsClient,
  locations,
  monitor,
  createdMonitors,
  updatedMonitors,
  failedMonitors,
  server,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  locations: Locations;
  monitor: PushBrowserMonitor;
  createdMonitors: string[];
  updatedMonitors: string[];
  failedMonitors: string[];
  server: UptimeServerSetup;
}) => {
  try {
    // check to see if monitor already exists
    const normalizedMonitor = normalizePushedMonitor({ locations, monitor });
    const previousMonitor = await getExistingMonitor(savedObjectsClient, monitor.id);

    if (previousMonitor) {
      await updateMonitor(
        savedObjectsClient,
        encryptedSavedObjectsClient,
        previousMonitor,
        normalizedMonitor,
        server
      );
      updatedMonitors.push(monitor.id);
    } else {
      const newMonitor = await savedObjectsClient.create<EncryptedSyntheticsMonitor>(
        syntheticsMonitorType,
        formatSecrets({
          ...normalizedMonitor,
          revision: 1,
        })
      );
      await syncNewMonitor({ server, monitor: normalizedMonitor, monitorSavedObject: newMonitor });
      createdMonitors.push(monitor.id);
    }
  } catch (e) {
    server.logger.error(e);
    // determine failed monitors reason
    failedMonitors.push(monitor.id);
    // throw e;
  }
};
