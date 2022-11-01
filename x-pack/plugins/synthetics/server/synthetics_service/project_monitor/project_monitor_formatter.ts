/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '@kbn/core/server';
import pMap from 'p-map';
import { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  ConfigKey,
  SyntheticsMonitorWithSecrets,
  EncryptedSyntheticsMonitor,
  ProjectMonitor,
  Locations,
  MonitorFields,
  PrivateLocation,
} from '../../../common/runtime_types';
import {
  syntheticsMonitorType,
  syntheticsMonitor,
} from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import type { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
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

export const FAILED_TO_CREATE_OR_UPDATE_MONITOR = i18n.translate(
  'xpack.synthetics.service.projectMonitors.failedToCreateOrUpdateMonitor',
  {
    defaultMessage: 'Failed to create or update monitor',
  }
);

export interface ProjectMonitorFormatterProps {
  locations: Locations;
  privateLocations: PrivateLocation[];
  savedObjectsClient: SavedObjectsClientContract;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  projectId: string;
  spaceId: string;
  server: UptimeServerSetup;
  request: KibanaRequest;
}

export class ProjectMonitorFormatter {
  public projectId: string;
  public spaceId: string;
  public locations: Locations;
  public privateLocations: PrivateLocation[];
  public savedObjectsClient: SavedObjectsClientContract;
  public encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  public failedMonitors: FailedError = [];
  public server: UptimeServerSetup;
  public projectFilter: string;
  public request: KibanaRequest;

  private writeIntegrationPoliciesPermissions?: boolean;

  constructor({
    locations,
    privateLocations,
    savedObjectsClient,
    encryptedSavedObjectsClient,
    projectId,
    spaceId,
    server,
    request,
  }: ProjectMonitorFormatterProps) {
    this.projectId = projectId;
    this.spaceId = spaceId;
    this.locations = locations;
    this.privateLocations = privateLocations;
    this.savedObjectsClient = savedObjectsClient;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.server = server;
    this.projectFilter = `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${this.projectId}"`;
    this.request = request;
  }

  public validatePermissions = async ({ monitor }: { monitor: ProjectMonitor }) => {
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

  public validateProjectMonitor = async ({ monitor }: { monitor: ProjectMonitor }) => {
    try {
      await this.validatePermissions({ monitor });

      const { normalizedFields: normalizedMonitor, errors } = normalizeProjectMonitor({
        monitor,
        locations: this.locations,
        privateLocations: this.privateLocations,
        projectId: this.projectId,
        namespace: this.spaceId,
        version: this.server.kibanaVersion,
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
        reason: FAILED_TO_CREATE_OR_UPDATE_MONITOR,
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

    await finder.close();

    return hits;
  };

  public getDecryptedMonitors = async (
    monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitor>>
  ) => {
    return await pMap(
      monitors,
      async (monitor) =>
        this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
          syntheticsMonitor.name,
          monitor.id,
          {
            namespace: monitor.namespaces?.[0],
          }
        ),
      { concurrency: 500 }
    );
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
