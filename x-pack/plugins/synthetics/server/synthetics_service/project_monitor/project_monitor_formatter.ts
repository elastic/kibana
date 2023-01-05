/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '@kbn/core/server';
import pMap from 'p-map';
import {
  SavedObjectsUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { getAllLocations } from '../get_all_locations';
import { syncNewMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/add_monitor_bulk';
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

type FailedError = Array<{ id?: string; reason: string; details: string; payload?: object }>;

export const INSUFFICIENT_FLEET_PERMISSIONS = i18n.translate(
  'xpack.synthetics.service.projectMonitors.insufficientFleetPermissions',
  {
    defaultMessage:
      'Insufficient permissions. In order to configure private locations, you must have Fleet and Integrations write permissions. To resolve, please generate a new API key with a user who has Fleet and Integrations write permissions.',
  }
);

export const CANNOT_UPDATE_MONITOR_TO_DIFFERENT_TYPE = i18n.translate(
  'xpack.synthetics.service.projectMonitors.cannotUpdateMonitorToDifferentType',
  {
    defaultMessage: 'Cannot update monitor to different type.',
  }
);

export const FAILED_TO_UPDATE_MONITOR = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToUpdateMonitor',
  {
    defaultMessage: 'Failed to create or update monitor',
  }
);

export const FAILED_TO_UPDATE_MONITORS = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToUpdateMonitors',
  {
    defaultMessage: 'Failed to create or update monitors',
  }
);

export class ProjectMonitorFormatter {
  private projectId: string;
  private spaceId: string;
  private publicLocations: Locations;
  private privateLocations: PrivateLocation[];
  private savedObjectsClient: SavedObjectsClientContract;
  private encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private monitors: ProjectMonitor[] = [];
  public createdMonitors: string[] = [];
  public updatedMonitors: string[] = [];
  public failedMonitors: FailedError = [];
  private server: UptimeServerSetup;
  private projectFilter: string;
  private syntheticsMonitorClient: SyntheticsMonitorClient;
  private request: KibanaRequest;

  private writeIntegrationPoliciesPermissions?: boolean;

  constructor({
    savedObjectsClient,
    encryptedSavedObjectsClient,
    projectId,
    spaceId,
    monitors,
    server,
    syntheticsMonitorClient,
    request,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    projectId: string;
    spaceId: string;
    monitors: ProjectMonitor[];
    server: UptimeServerSetup;
    syntheticsMonitorClient: SyntheticsMonitorClient;
    request: KibanaRequest;
  }) {
    this.projectId = projectId;
    this.spaceId = spaceId;
    this.savedObjectsClient = savedObjectsClient;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.syntheticsMonitorClient = syntheticsMonitorClient;
    this.monitors = monitors;
    this.server = server;
    this.projectFilter = `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${this.projectId}"`;
    this.request = request;
    this.publicLocations = [];
    this.privateLocations = [];
  }

  init = async () => {
    const locationsPromise = getAllLocations(
      this.server,
      this.syntheticsMonitorClient,
      this.savedObjectsClient
    );
    const existingMonitorsPromise = this.getProjectMonitorsForProject();

    const [locations, existingMonitors] = await Promise.all([
      locationsPromise,
      existingMonitorsPromise,
    ]);

    const { publicLocations, privateLocations } = locations;

    this.publicLocations = publicLocations;
    this.privateLocations = privateLocations;

    return existingMonitors;
  };

  public configureAllProjectMonitors = async () => {
    const existingMonitors = await this.init();

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
        if (
          previousMonitor &&
          previousMonitor.attributes[ConfigKey.MONITOR_TYPE] !== normM[ConfigKey.MONITOR_TYPE]
        ) {
          this.failedMonitors.push({
            reason: CANNOT_UPDATE_MONITOR_TO_DIFFERENT_TYPE,
            details: i18n.translate(
              'xpack.synthetics.service.projectMonitors.cannotUpdateMonitorToDifferentTypeDetails',
              {
                defaultMessage:
                  'Monitor {monitorId} of type {previousType} cannot be updated to type {currentType}. Please delete the monitor first and try again.',
                values: {
                  currentType: monitor.type,
                  previousType: previousMonitor.attributes[ConfigKey.MONITOR_TYPE],
                  monitorId: monitor.id,
                },
              }
            ),
            payload: monitor,
          });
        } else if (previousMonitor) {
          this.updatedMonitors.push(monitor.id);
          normalizedUpdateMonitors.push({ monitor: normM as MonitorFields, previousMonitor });
        } else {
          normalizedNewMonitors.push(normM as MonitorFields);
        }
      }
    }

    await this.createMonitorsBulk(normalizedNewMonitors);

    await this.updateMonitorsBulk(normalizedUpdateMonitors);
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
        locations: this.publicLocations,
        privateLocations: this.privateLocations,
        projectId: this.projectId,
        namespace: this.spaceId,
        version: this.server.stackVersion,
      });

      if (errors.length) {
        this.failedMonitors.push(...errors);
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
        reason: FAILED_TO_UPDATE_MONITOR,
        details: e.message,
        payload: monitor,
      });
    }
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

    // no need to wait for it
    finder.close();

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
        } else {
          this.failedMonitors.push({
            reason: i18n.translate(
              'xpack.synthetics.service.projectMonitors.failedToCreateXMonitors',
              {
                defaultMessage: 'Failed to create {length} monitors',
                values: {
                  length: monitors.length,
                },
              }
            ),
            details: FAILED_TO_UPDATE_MONITORS,
            payload: monitors,
          });
        }
      }
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        reason: i18n.translate('xpack.synthetics.service.projectMonitors.failedToCreateXMonitors', {
          defaultMessage: 'Failed to create {length} monitors',
          values: {
            length: monitors.length,
          },
        }),
        details: e.message,
        payload: monitors,
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
    if (monitors.length === 0) {
      return {
        editedMonitors: [],
        errors: [],
        updatedCount: 0,
      };
    }
    const decryptedPreviousMonitors = await this.getDecryptedMonitors(
      monitors.map((m) => m.previousMonitor)
    );

    const monitorsToUpdate = [];

    for (let i = 0; i < decryptedPreviousMonitors.length; i++) {
      const decryptedPreviousMonitor = decryptedPreviousMonitors[i];
      const previousMonitor = monitors[i].previousMonitor;
      const normalizedMonitor = monitors[i].monitor;

      const {
        attributes: { [ConfigKey.REVISION]: _, ...normalizedPreviousMonitorAttributes },
      } = normalizeSecrets(decryptedPreviousMonitor);

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
    }
    return validationResult;
  };
}
