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
import { deleteMonitor } from './delete_monitor';

interface StaleMonitor {
  stale: boolean;
  journeyId: string;
  savedObjectId: string;
}
type StaleMonitorMap = Record<string, StaleMonitor>;

const getSuiteFilter = (projectId: string) => {
  return `${syntheticsMonitorType}.attributes.${ConfigKey.IS_PUSH_MONITOR}: true AND ${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: ${projectId}`;
};

export const addPublicSyntheticsMonitorRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PUSH,
  validate: {
    body: schema.object({
      projectId: schema.string(),
      keep_stale: schema.boolean(),
      monitors: schema.arrayOf(schema.any()),
    }),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const monitors = (request.body?.monitors as PushBrowserMonitor[]) || [];
    const { keep_stale: keepStale, projectId } = request.body || {};
    const locations: Locations = (await getServiceLocations(server)).locations;
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();
    const staleMonitorsMap = await getAllPushMonitorsForSuite(savedObjectsClient, projectId);
    const createdMonitors: string[] = [];
    const deletedMonitors: string[] = [];
    const updatedMonitors: string[] = [];
    const staleMonitors: string[] = [];
    const failedMonitors: string[] = [];
    const failedStaleMonitors: string[] = [];

    await Promise.all(
      monitors.map((monitor) =>
        configurePushMonitor({
          savedObjectsClient,
          encryptedSavedObjectsClient,
          locations,
          monitor,
          createdMonitors,
          updatedMonitors,
          failedMonitors,
          server,
          staleMonitorsMap,
          projectId,
        })
      )
    );

    await handleStaleMonitors({
      savedObjectsClient,
      staleMonitorsMap,
      staleMonitors,
      deletedMonitors,
      server,
      keepStale,
    });

    return response.ok({
      body: {
        createdMonitors,
        updatedMonitors,
        staleMonitors,
        deletedMonitors,
        failedMonitors,
      },
    });
  },
});

const getExistingMonitor = async (
  savedObjectsClient: SavedObjectsClientContract,
  journeyId: string,
  projectId: string
): Promise<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> => {
  const { saved_objects: savedObjects } = await savedObjectsClient.find<EncryptedSyntheticsMonitor>(
    {
      type: syntheticsMonitorType,
      perPage: 1,
      filter: `${getSuiteFilter(projectId)} AND ${syntheticsMonitorType}.attributes.${
        ConfigKey.JOURNEY_ID
      }: ${journeyId}`,
    }
  );
  return savedObjects[0];
};

const getAllPushMonitorsForSuite = async (
  savedObjectsClient: SavedObjectsClientContract,
  projectId: string
): Promise<StaleMonitorMap> => {
  const staleMonitors: StaleMonitorMap = {};
  let page = 1;
  let totalMonitors = 0;
  do {
    const { total, saved_objects: savedObjects } = await getPushMonitorsForSuite(
      savedObjectsClient,
      page,
      projectId
    );
    savedObjects.forEach((savedObject) => {
      const journeyId = (savedObject.attributes as BrowserFields)[ConfigKey.JOURNEY_ID];
      if (journeyId) {
        staleMonitors[journeyId] = {
          stale: true,
          savedObjectId: savedObject.id,
          journeyId,
        };
      }
    });

    page++;
    totalMonitors = total;
  } while (Object.keys(staleMonitors).length < totalMonitors);
  return staleMonitors;
};

const getPushMonitorsForSuite = async (
  savedObjectsClient: SavedObjectsClientContract,
  page: number,
  projectId: string
) => {
  return await savedObjectsClient.find<EncryptedSyntheticsMonitor>({
    type: syntheticsMonitorType,
    page,
    perPage: 1,
    filter: getSuiteFilter(projectId),
  });
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

const configurePushMonitor = async ({
  savedObjectsClient,
  encryptedSavedObjectsClient,
  locations,
  monitor,
  createdMonitors,
  updatedMonitors,
  failedMonitors,
  server,
  staleMonitorsMap,
  projectId,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  locations: Locations;
  monitor: PushBrowserMonitor;
  createdMonitors: string[];
  updatedMonitors: string[];
  failedMonitors: string[];
  server: UptimeServerSetup;
  staleMonitorsMap: StaleMonitorMap;
  projectId: string;
}) => {
  try {
    // check to see if monitor already exists
    const normalizedMonitor = normalizePushedMonitor({ locations, monitor, projectId });
    const previousMonitor = await getExistingMonitor(savedObjectsClient, monitor.id, projectId);

    if (previousMonitor) {
      await updateMonitor(
        savedObjectsClient,
        encryptedSavedObjectsClient,
        previousMonitor,
        normalizedMonitor,
        server
      );
      updatedMonitors.push(monitor.id);
      if (staleMonitorsMap[monitor.id]) {
        staleMonitorsMap[monitor.id].stale = false;
      }
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
  }
};

const handleStaleMonitors = async ({
  savedObjectsClient,
  server,
  staleMonitorsMap,
  staleMonitors,
  deletedMonitors,
  keepStale,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  staleMonitorsMap: StaleMonitorMap;
  staleMonitors: string[];
  deletedMonitors: string[];
  keepStale: boolean;
}) => {
  try {
    const staleMonitorsData = Object.values(staleMonitorsMap).filter(
      (monitor) => monitor.stale === true
    );
    await Promise.all(
      staleMonitorsData.map((monitor) => {
        if (!keepStale) {
          return deleteStaleMonitor({
            deletedMonitors,
            savedObjectsClient,
            server,
            monitorId: monitor.savedObjectId,
            journeyId: monitor.journeyId,
          });
        } else {
          staleMonitors.push(monitor.journeyId);
          return null;
        }
      })
    );
  } catch (e) {
    server.logger.error(e);
  }
};

const deleteStaleMonitor = async ({
  deletedMonitors,
  savedObjectsClient,
  server,
  monitorId,
  journeyId,
}: {
  deletedMonitors: string[];
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  monitorId: string;
  journeyId: string;
}) => {
  await deleteMonitor({ savedObjectsClient, server, monitorId });
  deletedMonitors.push(journeyId);
};
