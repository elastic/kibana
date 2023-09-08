/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import {
  SavedObjectsUpdateResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { SyntheticsServerSetup } from '../../types';
import { RouteContext } from '../../routes/types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { getAllLocations } from '../get_all_locations';
import { syncNewMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/add_monitor_bulk';
import { SyntheticsMonitorClient } from '../synthetics_monitor/synthetics_monitor_client';
import { syncEditedMonitorBulk } from '../../routes/monitor_cruds/bulk_cruds/edit_monitor_bulk';
import {
  ConfigKey,
  SyntheticsMonitorWithSecretsAttributes,
  EncryptedSyntheticsMonitorAttributes,
  ServiceLocationErrors,
  ProjectMonitor,
  Locations,
  SyntheticsMonitor,
  MonitorFields,
} from '../../../common/runtime_types';
import { formatSecrets, normalizeSecrets } from '../utils/secrets';
import {
  validateProjectMonitor,
  validateMonitor,
  ValidationResult,
} from '../../routes/monitor_cruds/monitor_validation';
import { normalizeProjectMonitor } from './normalizers';

type FailedError = Array<{ id?: string; reason: string; details: string; payload?: object }>;

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

export class ProjectMonitorFormatter {
  private projectId: string;
  private spaceId: string;
  private publicLocations: Locations;
  private privateLocations: PrivateLocationAttributes[];
  private savedObjectsClient: SavedObjectsClientContract;
  private encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private monitors: ProjectMonitor[] = [];
  public createdMonitors: string[] = [];
  public updatedMonitors: string[] = [];
  public failedMonitors: FailedError = [];
  private server: SyntheticsServerSetup;
  private projectFilter: string;
  private syntheticsMonitorClient: SyntheticsMonitorClient;
  private routeContext: RouteContext;

  constructor({
    encryptedSavedObjectsClient,
    projectId,
    spaceId,
    monitors,
    routeContext,
  }: {
    routeContext: RouteContext;
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
    projectId: string;
    spaceId: string;
    monitors: ProjectMonitor[];
  }) {
    this.routeContext = routeContext;
    this.projectId = projectId;
    this.spaceId = spaceId;
    this.savedObjectsClient = routeContext.savedObjectsClient;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.syntheticsMonitorClient = routeContext.syntheticsMonitorClient;
    this.monitors = monitors;
    this.server = routeContext.server;
    this.projectFilter = `${syntheticsMonitorType}.attributes.${ConfigKey.PROJECT_ID}: "${this.projectId}"`;
    this.publicLocations = [];
    this.privateLocations = [];
  }

  init = async () => {
    const locationsPromise = getAllLocations({
      server: this.server,
      syntheticsMonitorClient: this.syntheticsMonitorClient,
      savedObjectsClient: this.savedObjectsClient,
    });
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
      previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>;
      monitor: SyntheticsMonitor;
    }> = [];

    for (const monitor of this.monitors) {
      const previousMonitor = existingMonitors.find(
        (monitorObj) =>
          (monitorObj.attributes as SyntheticsMonitor)[ConfigKey.JOURNEY_ID] === monitor.id
      );

      const normM = await this.validateProjectMonitor({
        monitor,
        publicLocations: this.publicLocations,
        privateLocations: this.privateLocations,
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

    await Promise.allSettled([
      this.createMonitorsBulk(normalizedNewMonitors),
      this.updateMonitorsBulk(normalizedUpdateMonitors),
    ]);
  };

  validateProjectMonitor = async ({
    monitor,
    publicLocations,
    privateLocations,
  }: {
    monitor: ProjectMonitor;
    publicLocations: Locations;
    privateLocations: PrivateLocationAttributes[];
  }) => {
    try {
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
        validationResult: validateProjectMonitor(
          {
            ...monitor,
            type: normalizedMonitor[ConfigKey.MONITOR_TYPE],
          },
          publicLocations,
          privateLocations
        ),
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
      perPage: 5000,
      filter: this.projectFilter,
    });

    const hits: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [];
    for await (const result of finder.find()) {
      hits.push(
        ...(result.saved_objects as Array<
          SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>
        >)
      );
    }

    // no need to wait for it
    finder.close();

    return hits;
  };

  private createMonitorsBulk = async (monitors: SyntheticsMonitor[]) => {
    try {
      if (monitors.length > 0) {
        const { newMonitors, failedMonitors } = await syncNewMonitorBulk({
          normalizedMonitors: monitors,
          routeContext: this.routeContext,
          privateLocations: this.privateLocations,
          spaceId: this.spaceId,
        });

        if (newMonitors.length > 0) {
          newMonitors.forEach((monitor) => {
            const journeyId = monitor.attributes[ConfigKey.JOURNEY_ID];
            if (journeyId && !monitor.error) {
              this.createdMonitors.push(journeyId);
            } else if (monitor.error) {
              this.failedMonitors.push({
                reason: i18n.translate(
                  'xpack.synthetics.service.projectMonitors.failedToCreateMonitors',
                  {
                    defaultMessage: 'Failed to create monitor: {journeyId}',
                    values: {
                      journeyId,
                    },
                  }
                ),
                details: monitor.error.message,
                payload: monitor,
              });
            }
          });
        }

        failedMonitors.forEach(({ monitor, error }) => {
          const journeyId = monitor.attributes[ConfigKey.JOURNEY_ID];

          this.failedMonitors.push({
            reason: error?.message ?? FAILED_TO_UPDATE_MONITOR,
            details: i18n.translate(
              'xpack.synthetics.service.projectMonitors.failedToCreateMonitors',
              {
                defaultMessage: 'Failed to create monitor: {journeyId}',
                values: {
                  journeyId,
                },
              }
            ),
            payload: monitors,
          });
        });
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
    monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>>
  ) => {
    return await pMap(
      monitors,
      async (monitor) =>
        this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
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
      previousMonitor: SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>;
    }>
  ): Promise<
    | {
        editedMonitors: Array<SavedObjectsUpdateResponse<EncryptedSyntheticsMonitorAttributes>>;
        errors: ServiceLocationErrors;
        updatedCount: number;
      }
    | undefined
  > => {
    try {
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

      const { editedMonitors, failedConfigs } = await syncEditedMonitorBulk({
        monitorsToUpdate,
        routeContext: this.routeContext,
        privateLocations: this.privateLocations,
        spaceId: this.spaceId,
      });

      if (failedConfigs && Object.keys(failedConfigs).length > 0) {
        const failedConfigsIds = Object.keys(failedConfigs);
        failedConfigsIds.forEach((id) => {
          const { config, error } = failedConfigs[id];

          const journeyId = config[ConfigKey.JOURNEY_ID];
          this.failedMonitors.push({
            reason: error?.message ?? FAILED_TO_UPDATE_MONITOR,
            details: i18n.translate(
              'xpack.synthetics.service.projectMonitors.failedToUpdateJourney',
              {
                defaultMessage: 'Failed to update journey: {journeyId}',
                values: {
                  journeyId,
                },
              }
            ),
            payload: config,
          });
        });

        // remove failed monitors from the list of updated monitors
        this.updatedMonitors.splice(
          this.updatedMonitors.findIndex((monitorId) => failedConfigsIds.includes(monitorId)),
          failedConfigsIds.length
        );
      }

      return {
        errors: [],
        editedMonitors: editedMonitors ?? [],
        updatedCount: monitorsToUpdate.length,
      };
    } catch (e) {
      this.server.logger.error(e);
      this.failedMonitors.push({
        reason: i18n.translate('xpack.synthetics.service.projectMonitors.failedToUpdateXMonitors', {
          defaultMessage: 'Failed to update {length} monitors',
          values: {
            length: monitors.length,
          },
        }),
        details: e.message,
        payload: monitors,
      });
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
    }
    return validationResult;
  };
}
