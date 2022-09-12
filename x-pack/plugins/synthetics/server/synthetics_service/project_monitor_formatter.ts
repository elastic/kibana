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
import { syncNewMonitorBulk } from '../routes/monitor_cruds/bulk_cruds/add_monitor_bulk';
import { SyntheticsMonitorClient } from './synthetics_monitor/synthetics_monitor_client';
import {
  BrowserFields,
  ConfigKey,
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

  private writeIntegrationPoliciesPermissions?: boolean;

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

    await this.syntheticsMonitorClient.privateLocationAPI.init(
      this.savedObjectsClient,
      this.request
    );

    const normalizedNewMonitors: BrowserFields[] = [];
    const normalizedUpdateMonitors: BrowserFields[] = [];

    const existingMonitors = await this.getExistingMonitors();

    for (const monitor of this.monitors) {
      const previousMonitor = existingMonitors.find(
        (eM) => eM.attributes[ConfigKey.JOURNEY_ID] === monitor.id
      );

      const normM = await this.validateProjectMonitor({
        monitor,
      });
      if (normM) {
        if (previousMonitor) {
          this.updatedMonitors.push(monitor.id);
          if (this.staleMonitorsMap[monitor.id]) {
            this.staleMonitorsMap[monitor.id].stale = false;
          }
          normalizedUpdateMonitors.push(normM);
        } else {
          this.createdMonitors.push(monitor.id);
          normalizedNewMonitors.push(normM);
        }
      }
    }

    await this.createMonitorsBulk(normalizedNewMonitors);

    if (normalizedNewMonitors.length > 0) {
      this.handleStreamingMessage({
        message: `${normalizedNewMonitors.length}: monitors created successfully`,
      });
    }

    await this.updateMonitorBulk(normalizedUpdateMonitors);

    if (normalizedUpdateMonitors.length > 0) {
      this.handleStreamingMessage({
        message: `${normalizedUpdateMonitors.length}: monitors updated successfully`,
      });
    }

    await this.handleStaleMonitors();
  };

  validatePermissions = async ({ monitor }: { monitor: ProjectBrowserMonitor }) => {
    if (this.writeIntegrationPoliciesPermissions || (monitor.privateLocations ?? []).length === 0) {
      return;
    }
    const {
      integrations: { writeIntegrationPolicies },
    } = await this.server.fleet.authz.fromRequest(this.request);

    this.writeIntegrationPoliciesPermissions = writeIntegrationPolicies;

    if ((monitor.privateLocations ?? []).length > 0 && !writeIntegrationPolicies) {
      throw new Error(
        'Insufficient permissions. In order to configure private locations, you must have Fleet and Integrations write permissions. To resolve, please generate a new API key with a user who has Fleet and Integrations write permissions.'
      );
    }
  };

  validateProjectMonitor = async ({ monitor }: { monitor: ProjectBrowserMonitor }) => {
    try {
      await this.validatePermissions({ monitor });

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

      return normalizedMonitor;
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
    } while (false);
    return staleMonitors;
  };

  private getProjectMonitorsForProject = async (page: number) => {
    return await this.savedObjectsClient.find<EncryptedSyntheticsMonitor>({
      type: syntheticsMonitorType,
      page,
      perPage: 10000,
      filter: this.projectFilter,
    });
  };

  private getExistingMonitors = async (): Promise<
    Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>
  > => {
    const { total, saved_objects: savedObjects } = await this.getProjectMonitorsForProject(1);

    return savedObjects;
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

  private createMonitorsBulk = async (normalizedMonitors: BrowserFields[]) => {
    await syncNewMonitorBulk({
      normalizedMonitors,
      monitors: normalizedMonitors,
      server: this.server,
      syntheticsMonitorClient: this.syntheticsMonitorClient,
      savedObjectsClient: this.savedObjectsClient,
      request: this.request,
    });
  };

  private updateMonitorBulk = async (normalizedMonitors: BrowserFields[]) => {
    for (const monitor of normalizedMonitors) {
      const previousMonitor = await this.getExistingMonitor(monitor[ConfigKey.JOURNEY_ID]!);
      await this.updateMonitor(previousMonitor, monitor);
    }
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

    if (hasMonitorBeenEdited) {
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
      const staleMonitorsData = Object.values(this.staleMonitorsMap).filter(
        (monitor) => monitor.stale === true
      );

      for (const staleMons of this.chunkRequests(staleMonitorsData)) {
        await deleteMonitorBulk({
          monitorIds: staleMons.map((sm) => sm.savedObjectId),
          savedObjectsClient: this.savedObjectsClient,
          server: this.server,
          syntheticsMonitorClient: this.syntheticsMonitorClient,
          request: this.request,
        });
      }

      if (staleMonitorsData.length > 0) {
        this.handleStreamingMessage({
          message: `Deleted ${staleMonitorsData.length} stale monitors`,
        });
      }
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
        monitorId,
        savedObjectsClient: this.savedObjectsClient,
        server: this.server,
        syntheticsMonitorClient: this.syntheticsMonitorClient,
        request: this.request,
      });
      this.deletedMonitors.push(journeyId);
      this.handleStreamingMessage({ message: `Monitor ${journeyId} deleted successfully` });
    } catch (e) {
      this.handleStreamingMessage({ message: `Monitor ${journeyId} could not be deleted` });
      this.failedStaleMonitors.push({
        id: journeyId,
        reason: 'Failed to delete stale monitor',
        details: e.message,
      });
    }
  };

  private handleStreamingMessage = async ({ message }: { message: string }) => {
    if (this.subject) {
      this.subject?.next(message);
    }
  };

  private chunkRequests = (requests: unknown[]) => {
    const perChunk = 1000; // items per chunk

    const result = requests.reduce<unknown[][]>((resultArray, item, index) => {
      const chunkIndex = Math.floor(index / perChunk);

      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []; // start a new chunk
      }

      resultArray[chunkIndex].push(item);

      return resultArray;
    }, []);

    return result;
  };
}
