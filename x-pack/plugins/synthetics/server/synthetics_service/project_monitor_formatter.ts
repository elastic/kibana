/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import {
  SavedObjectsUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  BrowserFields,
  ConfigKey,
  MonitorFields,
  SyntheticsMonitorWithSecrets,
  EncryptedSyntheticsMonitor,
  ServiceLocationErrors,
  ProjectBrowserMonitor,
  Locations,
} from '../../common/runtime_types';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { normalizeProjectMonitor } from './normalizers/browser';
import { formatSecrets, normalizeSecrets } from './utils/secrets';
import { syncNewMonitor } from '../routes/monitor_cruds/add_monitor';
import { syncEditedMonitor } from '../routes/monitor_cruds/edit_monitor';
import { deleteMonitor } from '../routes/monitor_cruds/delete_monitor';
import { validateProjectMonitor } from '../routes/monitor_cruds/monitor_validation';
import type { UptimeServerSetup } from '../legacy_uptime/lib/adapters/framework';

interface StaleMonitor {
  stale: boolean;
  journeyId: string;
  savedObjectId: string;
}
type StaleMonitorMap = Record<string, StaleMonitor>;
type FailedMonitors = Array<{ id: string; reason: string; details: string; payload?: object }>;

export class ProjectMonitorFormatter {
  private projectId: string;
  private spaceId: string;
  private keepStale: boolean;
  private locations: Locations;
  private savedObjectsClient: SavedObjectsClientContract;
  private encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private staleMonitorsMap: StaleMonitorMap = {};
  private monitors: ProjectBrowserMonitor[] = [];
  public createdMonitors: string[] = [];
  public deletedMonitors: string[] = [];
  public updatedMonitors: string[] = [];
  public staleMonitors: string[] = [];
  public failedMonitors: FailedMonitors = [];
  public failedStaleMonitors: FailedMonitors = [];
  private server: UptimeServerSetup;
  private projectFilter: string;

  constructor({
    locations,
    keepStale,
    savedObjectsClient,
    encryptedSavedObjectsClient,
    projectId,
    spaceId,
    monitors,
    server,
  }: {
    locations: Locations;
    keepStale: boolean;
    savedObjectsClient: SavedObjectsClientContract;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    projectId: string;
    spaceId: string;
    monitors: ProjectBrowserMonitor[];
    server: UptimeServerSetup;
  }) {
    this.projectId = projectId;
    this.spaceId = spaceId;
    this.locations = locations;
    this.keepStale = keepStale;
    this.savedObjectsClient = savedObjectsClient;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.monitors = monitors;
    this.server = server;
    this.projectFilter = `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${this.projectId}"`;
  }

  public configureAllProjectMonitors = async () => {
    this.staleMonitorsMap = await this.getAllProjectMonitorsForProject();
    await Promise.all(
      this.monitors.map((monitor) =>
        this.configureProjectMonitor({
          monitor,
        })
      )
    );

    await this.handleStaleMonitors();
  };

  private configureProjectMonitor = async ({ monitor }: { monitor: ProjectBrowserMonitor }) => {
    try {
      // check to see if monitor already exists
      const normalizedMonitor = normalizeProjectMonitor({
        locations: this.locations,
        monitor,
        projectId: this.projectId,
        namespace: this.spaceId,
      });

      const validationResult = validateProjectMonitor(monitor, this.projectId);

      if (!validationResult.valid) {
        const { reason: message, details, payload } = validationResult;
        this.failedMonitors.push({
          id: monitor.id,
          reason: message,
          details,
          payload,
        });
        if (this.staleMonitorsMap[monitor.id]) {
          this.staleMonitorsMap[monitor.id].stale = false;
        }
        return null;
      }

      const previousMonitor = await this.getExistingMonitor(monitor.id);

      if (previousMonitor) {
        await this.updateMonitor(previousMonitor, normalizedMonitor);
        this.updatedMonitors.push(monitor.id);
        if (this.staleMonitorsMap[monitor.id]) {
          this.staleMonitorsMap[monitor.id].stale = false;
        }
      } else {
        const newMonitor = await this.savedObjectsClient.create<EncryptedSyntheticsMonitor>(
          syntheticsMonitorType,
          formatSecrets({
            ...normalizedMonitor,
            revision: 1,
          })
        );
        await syncNewMonitor({
          server: this.server,
          monitor: normalizedMonitor,
          monitorSavedObject: newMonitor,
        });
        this.createdMonitors.push(monitor.id);
      }
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        id: monitor.id,
        reason: 'Failed to create or update monitor',
        details: e.message,
        payload: monitor,
      });
    }
  };

  private getAllProjectMonitorsForProject = async (): Promise<StaleMonitorMap> => {
    const staleMonitors: StaleMonitorMap = {};
    let page = 1;
    let totalMonitors = 0;
    do {
      const { total, saved_objects: savedObjects } = await this.getProjectMonitorsForProject(page);
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

  private getProjectMonitorsForProject = async (page: number) => {
    return await this.savedObjectsClient.find<EncryptedSyntheticsMonitor>({
      type: syntheticsMonitorType,
      page,
      perPage: 500,
      filter: this.projectFilter,
    });
  };

  private getExistingMonitor = async (
    journeyId: string
  ): Promise<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> => {
    const filter = `${this.projectFilter} AND ${syntheticsMonitorType}.attributes.${ConfigKey.JOURNEY_ID}: "${journeyId}"`;
    const { saved_objects: savedObjects } =
      await this.savedObjectsClient.find<EncryptedSyntheticsMonitor>({
        type: syntheticsMonitorType,
        perPage: 1,
        filter,
      });
    return savedObjects?.[0];
  };

  private updateMonitor = async (
    previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitor>,
    normalizedMonitor: BrowserFields
  ): Promise<{
    editedMonitor: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>;
    errors: ServiceLocationErrors;
  }> => {
    const decryptedPreviousMonitor =
      await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
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
      ...normalizedPreviousMonitorAttributes, // ensures monitor AAD remains consistent in the event of field name changes
      ...normalizedMonitor,
      revision: hasMonitorBeenEdited
        ? (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1
        : previousMonitor.attributes[ConfigKey.REVISION],
    });
    const editedMonitor: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor> =
      await this.savedObjectsClient.update<MonitorFields>(
        syntheticsMonitorType,
        previousMonitor.id,
        {
          ...monitorWithRevision,
          urls: '',
        }
      );

    if (hasMonitorBeenEdited) {
      syncEditedMonitor({
        editedMonitor: normalizedMonitor,
        editedMonitorSavedObject: editedMonitor,
        previousMonitor,
        server: this.server,
      });
    }

    return { editedMonitor, errors: [] };
  };

  private handleStaleMonitors = async () => {
    try {
      const staleMonitorsData = Object.values(this.staleMonitorsMap).filter(
        (monitor) => monitor.stale === true
      );
      await Promise.all(
        staleMonitorsData.map((monitor) => {
          if (!this.keepStale) {
            return this.deleteStaleMonitor({
              monitorId: monitor.savedObjectId,
              journeyId: monitor.journeyId,
            });
          } else {
            this.staleMonitors.push(monitor.journeyId);
            return null;
          }
        })
      );
    } catch (e) {
      this.server.logger.error(e);
    }
  };

  private deleteStaleMonitor = async ({
    monitorId,
    journeyId,
  }: {
    monitorId: string;
    journeyId: string;
  }) => {
    try {
      await deleteMonitor({
        savedObjectsClient: this.savedObjectsClient,
        server: this.server,
        monitorId,
      });
      this.deletedMonitors.push(journeyId);
    } catch (e) {
      this.failedStaleMonitors.push({
        id: monitorId,
        reason: 'Failed to delete stale monitor',
        details: e.message,
      });
    }
  };
}
