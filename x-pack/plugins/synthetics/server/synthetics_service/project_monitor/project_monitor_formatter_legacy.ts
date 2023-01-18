/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Subject } from 'rxjs';
import { omit, isEqual } from 'lodash';
import { KibanaRequest } from '@kbn/core/server';
import {
  SavedObjectsUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import pMap from 'p-map';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { syncNewMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/add_monitor_bulk';
import { deleteMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/delete_monitor_bulk';
import { SyntheticsMonitorClient } from '../synthetics_monitor/synthetics_monitor_client';
import { syncEditedMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/edit_monitor_bulk';
import {
  ConfigKey,
  SyntheticsMonitorWithSecrets,
  EncryptedSyntheticsMonitor,
  ServiceLocationErrors,
  ProjectMonitor,
  Locations,
  SyntheticsMonitor,
  MonitorFields,
  PrivateLocation,
} from '../../../common/runtime_types';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import type { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { formatSecrets, normalizeSecrets } from '../utils/secrets';
import {
  validateProjectMonitor,
  validateMonitor,
  ValidationResult,
} from '../../routes/monitor_cruds/monitor_validation';
import { normalizeProjectMonitor } from './normalizers';

interface StaleMonitor {
  stale: boolean;
  journeyId: string;
  savedObjectId: string;
}
type StaleMonitorMap = Record<string, StaleMonitor>;
type FailedError = Array<{ id?: string; reason: string; details: string; payload?: object }>;

export const INSUFFICIENT_FLEET_PERMISSIONS =
  'Insufficient permissions. In order to configure private locations, you must have Fleet and Integrations write permissions. To resolve, please generate a new API key with a user who has Fleet and Integrations write permissions.';

export class ProjectMonitorFormatterLegacy {
  private projectId: string;
  private spaceId: string;
  private keepStale: boolean;
  private locations: Locations;
  private privateLocations: PrivateLocation[];
  private savedObjectsClient: SavedObjectsClientContract;
  private encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private staleMonitorsMap: StaleMonitorMap = {};
  private monitors: ProjectMonitor[] = [];
  public createdMonitors: string[] = [];
  public deletedMonitors: string[] = [];
  public updatedMonitors: string[] = [];
  public staleMonitors: string[] = [];
  public failedMonitors: FailedError = [];
  public failedStaleMonitors: FailedError = [];
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
    privateLocations: PrivateLocation[];
    keepStale: boolean;
    savedObjectsClient: SavedObjectsClientContract;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    projectId: string;
    spaceId: string;
    monitors: ProjectMonitor[];
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
    const existingMonitors = await this.getProjectMonitorsForProject();
    this.staleMonitorsMap = await this.getStaleMonitorsMap(existingMonitors);

    const normalizedNewMonitors: SyntheticsMonitor[] = [];
    const normalizedUpdateMonitors: Array<{
      previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitor>;
      monitor: SyntheticsMonitor;
    }> = [];

    for (const monitor of this.monitors) {
      const previousMonitor = existingMonitors.find(
        (monitorObj) =>
          (monitorObj.attributes as SyntheticsMonitor)[ConfigKey.JOURNEY_ID] === monitor.id
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
          normalizedUpdateMonitors.push({ monitor: normM as MonitorFields, previousMonitor });
        } else {
          normalizedNewMonitors.push(normM as MonitorFields);
        }
      }
    }

    await this.createMonitorsBulk(normalizedNewMonitors);

    const { updatedCount } = await this.updateMonitorsBulk(normalizedUpdateMonitors);

    if (normalizedUpdateMonitors.length > 0) {
      let updateMessage = '';
      if (updatedCount > 0) {
        updateMessage = `${updatedCount} monitor${
          updatedCount > 1 ? 's' : ''
        } updated successfully.`;
      }

      const noChanges = normalizedUpdateMonitors.length - updatedCount;
      let noChangeMessage = '';
      if (noChanges > 0) {
        noChangeMessage = `${noChanges} monitor${noChanges > 1 ? 's' : ''} found with no changes.`;
      }

      this.handleStreamingMessage({
        message: `${updateMessage} ${noChangeMessage}`,
      });
    }

    await this.handleStaleMonitors();
  };

  validatePermissions = async ({ monitor }: { monitor: ProjectMonitor }) => {
    if (this.writeIntegrationPoliciesPermissions || (monitor.privateLocations ?? []).length === 0) {
      return;
    }
    const {
      integrations: { writeIntegrationPolicies },
    } = await this.server.fleet.authz.fromRequest(this.request);

    this.writeIntegrationPoliciesPermissions = writeIntegrationPolicies;

    if (!writeIntegrationPolicies) {
      throw new Error(INSUFFICIENT_FLEET_PERMISSIONS);
    }
  };

  validateProjectMonitor = async ({ monitor }: { monitor: ProjectMonitor }) => {
    try {
      await this.validatePermissions({ monitor });

      const { normalizedFields: normalizedMonitor, errors } = normalizeProjectMonitor({
        monitor,
        locations: this.locations,
        privateLocations: this.privateLocations,
        projectId: this.projectId,
        namespace: this.spaceId,
        version: this.server.stackVersion,
      });

      if (errors.length) {
        this.failedMonitors.push(...errors);
        this.handleStreamingMessage({
          message: `${monitor.id}: failed to create or update monitor`,
        });
        return null;
      }

      /* Validates that the payload sent from the synthetics agent is valid */
      const { valid: isMonitorPayloadValid } = this.validateMonitor({
        validationResult: validateProjectMonitor({
          ...monitor,
          type: normalizedMonitor[ConfigKey.MONITOR_TYPE],
        }),
        monitorId: monitor.id,
      });

      if (!isMonitorPayloadValid) {
        return null;
      }

      /* Validates that the normalized monitor is a valid monitor saved object type */
      const { valid: isNormalizedMonitorValid, decodedMonitor } = this.validateMonitor({
        validationResult: validateMonitor(normalizedMonitor as MonitorFields),
        monitorId: monitor.id,
      });

      if (!isNormalizedMonitorValid || !decodedMonitor) {
        return null;
      }

      return decodedMonitor;
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

  private getStaleMonitorsMap = async (
    existingMonitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>
  ): Promise<StaleMonitorMap> => {
    const staleMonitors: StaleMonitorMap = {};

    existingMonitors.forEach((savedObject) => {
      const journeyId = (savedObject.attributes as SyntheticsMonitor)[ConfigKey.JOURNEY_ID];
      if (journeyId) {
        staleMonitors[journeyId] = {
          stale: true,
          savedObjectId: savedObject.id,
          journeyId,
        };
      }
    });

    return staleMonitors;
  };

  public getProjectMonitorsForProject = async () => {
    const finder = this.savedObjectsClient.createPointInTimeFinder({
      type: syntheticsMonitorType,
      perPage: 1000,
      filter: this.projectFilter,
    });

    const hits: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>> = [];
    for await (const result of finder.find()) {
      hits.push(
        ...(result.saved_objects as Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>)
      );
    }

    await finder.close();

    return hits;
  };

  private createMonitorsBulk = async (monitors: SyntheticsMonitor[]) => {
    try {
      if (monitors.length > 0) {
        const { newMonitors } = await syncNewMonitorBulk({
          normalizedMonitors: monitors,
          server: this.server,
          syntheticsMonitorClient: this.syntheticsMonitorClient,
          soClient: this.savedObjectsClient,
          request: this.request,
          privateLocations: this.privateLocations,
          spaceId: this.spaceId,
        });

        if (newMonitors && newMonitors.length === monitors.length) {
          this.createdMonitors.push(...monitors.map((monitor) => monitor[ConfigKey.JOURNEY_ID]!));
          this.handleStreamingMessage({
            message: `${monitors.length} monitor${
              monitors.length > 1 ? 's' : ''
            } created successfully.`,
          });
        } else {
          this.failedMonitors.push({
            reason: `Failed to create ${monitors.length} monitors`,
            details: 'Failed to create monitors',
            payload: monitors,
          });
          this.handleStreamingMessage({
            message: `Failed to create ${monitors.length} monitors`,
          });
        }
      }
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        reason: `Failed to create ${monitors.length} monitors`,
        details: e.message,
        payload: monitors,
      });
      this.handleStreamingMessage({
        message: `Failed to create ${monitors.length} monitors`,
      });
    }
  };

  private getDecryptedMonitors = async (
    monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>
  ) => {
    return await pMap(
      monitors,
      async (monitor) =>
        this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
          syntheticsMonitorType,
          monitor.id,
          {
            namespace: monitor.namespaces?.[0],
          }
        ),
      { concurrency: 500 }
    );
  };

  private updateMonitorsBulk = async (
    monitors: Array<{
      monitor: SyntheticsMonitor;
      previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitor>;
    }>
  ): Promise<{
    editedMonitors: Array<SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>>;
    errors: ServiceLocationErrors;
    updatedCount: number;
  }> => {
    const decryptedPreviousMonitors = await this.getDecryptedMonitors(
      monitors.map((m) => m.previousMonitor)
    );

    const monitorsToUpdate = [];

    for (let i = 0; i < decryptedPreviousMonitors.length; i++) {
      const decryptedPreviousMonitor = decryptedPreviousMonitors[i];
      const previousMonitor = monitors[i].previousMonitor;
      const normalizedMonitor = monitors[i].monitor;

      const keysToOmit = [ConfigKey.REVISION, ConfigKey.MONITOR_QUERY_ID, ConfigKey.CONFIG_ID];
      const { attributes: normalizedPreviousMonitorAttributes } =
        normalizeSecrets(decryptedPreviousMonitor);
      const hasMonitorBeenEdited = !isEqual(
        omit(normalizedMonitor, keysToOmit),
        omit(normalizedPreviousMonitorAttributes, keysToOmit)
      );

      if (hasMonitorBeenEdited) {
        const monitorWithRevision = formatSecrets({
          ...normalizedPreviousMonitorAttributes,
          ...normalizedMonitor,
          revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
        });
        monitorsToUpdate.push({
          normalizedMonitor,
          previousMonitor,
          monitorWithRevision,
          decryptedPreviousMonitor,
        });
      }
    }

    const { editedMonitors } = await syncEditedMonitorBulk({
      monitorsToUpdate,
      server: this.server,
      syntheticsMonitorClient: this.syntheticsMonitorClient,
      savedObjectsClient: this.savedObjectsClient,
      request: this.request,
      privateLocations: this.privateLocations,
      spaceId: this.spaceId,
    });
    return {
      editedMonitors: editedMonitors ?? [],
      errors: [],
      updatedCount: monitorsToUpdate.length,
    };
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

            for (const sm of chunkMonitors) {
              const journeyId = (sm.attributes as MonitorFields)[ConfigKey.JOURNEY_ID]!;

              this.deletedMonitors.push(journeyId);
              this.handleStreamingMessage({
                message: `Monitor ${journeyId} deleted successfully`,
              });
            }
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

  private handleStreamingMessage = ({ message }: { message: string }) => {
    if (this.subject) {
      this.subject?.next(message);
    }
  };

  private validateMonitor = ({
    validationResult,
    monitorId,
  }: {
    validationResult: ValidationResult;
    monitorId: string;
  }) => {
    const { reason: message, details, payload: validationPayload, valid } = validationResult;
    if (!valid) {
      this.failedMonitors.push({
        id: monitorId,
        reason: message,
        details,
        payload: validationPayload,
      });
      if (this.staleMonitorsMap[monitorId]) {
        this.staleMonitorsMap[monitorId].stale = false;
      }
    }
    return validationResult;
  };
}
