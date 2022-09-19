/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Subject } from 'rxjs';
import { isEqual } from 'lodash';
import { KibanaRequest } from '@kbn/core/server';
import {
  SavedObjectsUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { deleteMonitorBulk } from '../routes/monitor_cruds/bulk_cruds/delete_monitor_bulk';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';
import {
  BrowserFields,
  ConfigKey,
  SyntheticsMonitorWithSecrets,
  EncryptedSyntheticsMonitor,
  ServiceLocationErrors,
  ProjectBrowserMonitor,
  Locations,
  SyntheticsMonitor,
  MonitorFields,
} from '../../common/runtime_types';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { normalizeProjectMonitor } from './normalizers/browser';
import { formatSecrets, normalizeSecrets } from './utils/secrets';
import { syncNewMonitor } from '../routes/monitor_cruds/add_monitor';
import { syncEditedMonitor } from '../routes/monitor_cruds/edit_monitor';
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
  private privateLocations: Locations;
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
  private syntheticsMonitorClient: SyntheticsMonitorClient;
  private request: KibanaRequest;
  private subject?: Subject<unknown>;

  constructor({
    locations,
    privateLocations,
    keepStale,
    savedObjectsClient,
    encryptedSavedObjectsClient,
    projectId,
    spaceId,
    monitors,
    server,
    syntheticsMonitorClient,
    request,
    subject,
  }: {
    locations: Locations;
    privateLocations: Locations;
    keepStale: boolean;
    savedObjectsClient: SavedObjectsClientContract;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    projectId: string;
    spaceId: string;
    monitors: ProjectBrowserMonitor[];
    server: UptimeServerSetup;
    syntheticsMonitorClient: SyntheticsMonitorClient;
    request: KibanaRequest;
    subject?: Subject<unknown>;
  }) {
    this.projectId = projectId;
    this.spaceId = spaceId;
    this.locations = locations;
    this.privateLocations = privateLocations;
    this.keepStale = keepStale;
    this.savedObjectsClient = savedObjectsClient;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.monitors = monitors;
    this.server = server;
    this.projectFilter = `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${this.projectId}"`;
    this.request = request;
    this.subject = subject;
  }

  public configureAllProjectMonitors = async () => {
    this.staleMonitorsMap = await this.getAllProjectMonitorsForProject();
    for (const monitor of this.monitors) {
      await this.configureProjectMonitor({ monitor });
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await this.handleStaleMonitors();
  };

  private configureProjectMonitor = async ({ monitor }: { monitor: ProjectBrowserMonitor }) => {
    try {
      const {
        integrations: { writeIntegrationPolicies },
      } = await this.server.fleet.authz.fromRequest(this.request);

      if (monitor.privateLocations?.length && !writeIntegrationPolicies) {
        throw new Error(
          'Insufficient permissions. In order to configure private locations, you must have Fleet and Integrations write permissions. To resolve, please generate a new API key with a user who has Fleet and Integrations write permissions.'
        );
      }

      // check to see if monitor already exists
      const normalizedMonitor = normalizeProjectMonitor({
        locations: this.locations,
        privateLocations: this.privateLocations,
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
        this.handleStreamingMessage({ message: `${monitor.id}: monitor updated successfully` });
      } else {
        await this.createMonitor(normalizedMonitor);
        this.createdMonitors.push(monitor.id);
        this.handleStreamingMessage({ message: `${monitor.id}: monitor created successfully` });
      }
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        id: monitor.id,
        reason: 'Failed to create or update monitor',
        details: e.message,
        payload: monitor,
      });
      this.handleStreamingMessage({ message: `${monitor.id}: failed to create or update monitor` });
      if (this.staleMonitorsMap[monitor.id]) {
        this.staleMonitorsMap[monitor.id].stale = false;
      }
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

  private createMonitor = async (normalizedMonitor: BrowserFields) => {
    await syncNewMonitor({
      normalizedMonitor,
      monitor: normalizedMonitor,
      server: this.server,
      syntheticsMonitorClient: this.syntheticsMonitorClient,
      savedObjectsClient: this.savedObjectsClient,
      request: this.request,
    });
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

    if (hasMonitorBeenEdited) {
      const monitorWithRevision = formatSecrets({
        ...normalizedPreviousMonitorAttributes,
        ...normalizedMonitor,
        revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
      });

      const { editedMonitor } = await syncEditedMonitor({
        normalizedMonitor,
        monitorWithRevision,
        previousMonitor,
        decryptedPreviousMonitor,
        server: this.server,
        syntheticsMonitorClient: this.syntheticsMonitorClient,
        savedObjectsClient: this.savedObjectsClient,
        request: this.request,
      });
      return { editedMonitor, errors: [] };
    }

    return { errors: [], editedMonitor: decryptedPreviousMonitor };
  };

  private handleStaleMonitors = async () => {
    try {
      const staleMonitorsList = Object.values(this.staleMonitorsMap).filter(
        (monitor) => monitor.stale === true
      );

      const encryptedMonitors = await this.savedObjectsClient.bulkGet<SyntheticsMonitor>(
        staleMonitorsList.map((staleMonitor) => ({
          id: staleMonitor.savedObjectId,
          type: syntheticsMonitorType,
        }))
      );

      let monitors = encryptedMonitors.saved_objects;

      const hasPrivateMonitor = monitors.some((monitor) =>
        monitor.attributes.locations.some((location) => !location.isServiceManaged)
      );

      if (hasPrivateMonitor) {
        const {
          integrations: { writeIntegrationPolicies },
        } = await this.server.fleet.authz.fromRequest(this.request);
        if (!writeIntegrationPolicies) {
          monitors = monitors.filter((monitor) => {
            const hasPrivateLocation = monitor.attributes.locations.some(
              (location) => !location.isServiceManaged
            );
            if (hasPrivateLocation) {
              const journeyId = (monitor.attributes as MonitorFields)[ConfigKey.JOURNEY_ID]!;
              const monitorName = (monitor.attributes as MonitorFields)[ConfigKey.NAME]!;
              this.handleStreamingMessage({
                message: `Monitor ${journeyId} could not be deleted`,
              });
              this.failedStaleMonitors.push({
                id: journeyId,
                reason: 'Failed to delete stale monitor',
                details: `Unable to delete Synthetics package policy for monitor ${monitorName}. Fleet write permissions are needed to use Synthetics private locations.`,
              });
            }
            return !hasPrivateLocation;
          });
        }
      }

      const chunkSize = 100;
      for (let i = 0; i < monitors.length; i += chunkSize) {
        const chunkMonitors = monitors.slice(i, i + chunkSize);
        try {
          if (!this.keepStale) {
            await deleteMonitorBulk({
              monitors: chunkMonitors,
              savedObjectsClient: this.savedObjectsClient,
              server: this.server,
              syntheticsMonitorClient: this.syntheticsMonitorClient,
              request: this.request,
            });

            chunkMonitors.forEach((sm) => {
              const journeyId = (sm.attributes as MonitorFields)[ConfigKey.JOURNEY_ID]!;

              this.deletedMonitors.push(journeyId);
              this.handleStreamingMessage({
                message: `Monitor ${journeyId} deleted successfully`,
              });
            });
          } else {
            chunkMonitors.forEach((sm) => {
              const journeyId = (sm.attributes as MonitorFields)[ConfigKey.JOURNEY_ID]!;
              this.staleMonitors.push(journeyId);
            });
          }
        } catch (e) {
          chunkMonitors.forEach((sm) => {
            const journeyId = (sm.attributes as MonitorFields)[ConfigKey.JOURNEY_ID]!;

            this.handleStreamingMessage({
              message: `Monitor ${journeyId} could not be deleted`,
            });
            this.failedStaleMonitors.push({
              id: journeyId,
              reason: 'Failed to delete stale monitor',
              details: e.message,
              payload: staleMonitorsList.find(
                (staleMonitor) => staleMonitor.savedObjectId === sm.id
              ),
            });
          });
          this.server.logger.error(e);
        }
      }
    } catch (e) {
      this.server.logger.error(e);
    }
  };

  private handleStreamingMessage = async ({ message }: { message: string }) => {
    if (this.subject) {
      this.subject?.next(message);
    }
  };
}
