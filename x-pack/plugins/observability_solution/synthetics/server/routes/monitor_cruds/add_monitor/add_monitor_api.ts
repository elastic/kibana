/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';
import { parseMonitorLocations } from './utils';
import { MonitorValidationError } from '../monitor_validation';
import { getKqlFilter } from '../../common';
import { deleteMonitor } from '../delete_monitor';
import { monitorAttributes, syntheticsMonitorType } from '../../../../common/types/saved_objects';
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { ConfigKey } from '../../../../common/constants/monitor_management';
import {
  EncryptedSyntheticsMonitorAttributes,
  MonitorFields,
  MonitorTypeEnum,
  ServiceLocations,
  SyntheticsMonitor,
} from '../../../../common/runtime_types';
import {
  getMaxAttempts,
  getMonitorLocations,
  getMonitorSchedule,
} from '../../../synthetics_service/project_monitor/normalizers/common_fields';
import {
  DEFAULT_FIELDS,
  DEFAULT_NAMESPACE_STRING,
} from '../../../../common/constants/monitor_defaults';
import { triggerTestNow } from '../../synthetics_service/test_now_monitor';
import { DefaultAlertService } from '../../default_alerts/default_alert_service';
import { RouteContext } from '../../types';
import { formatTelemetryEvent, sendTelemetryEvents } from '../../telemetry/monitor_upgrade_sender';
import { formatSecrets } from '../../../synthetics_service/utils';
import { formatKibanaNamespace } from '../../../../common/formatters';
import { getPrivateLocations } from '../../../synthetics_service/get_private_locations';

export type CreateMonitorPayLoad = MonitorFields & {
  url?: string;
  host?: string;
  locations?: string[] | ServiceLocations;
  private_locations?: string[] | PrivateLocationAttributes[];
  schedule?: number | MonitorFields['schedule'];
};

export class AddEditMonitorAPI {
  routeContext: RouteContext;
  allPrivateLocations?: PrivateLocationAttributes[];
  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async syncNewMonitor({
    id,
    normalizedMonitor,
  }: {
    id?: string;
    normalizedMonitor: SyntheticsMonitor;
  }) {
    const { savedObjectsClient, server, syntheticsMonitorClient, spaceId } = this.routeContext;
    const newMonitorId = id ?? uuidV4();

    let monitorSavedObject: SavedObject<EncryptedSyntheticsMonitorAttributes> | null = null;
    const monitorWithNamespace = this.hydrateMonitorFields({
      normalizedMonitor,
      newMonitorId,
    });

    try {
      const newMonitorPromise = this.createNewSavedObjectMonitor({
        normalizedMonitor: monitorWithNamespace,
        id: newMonitorId,
        savedObjectsClient,
      });

      const syncErrorsPromise = syntheticsMonitorClient.addMonitors(
        [{ monitor: monitorWithNamespace as MonitorFields, id: newMonitorId }],
        savedObjectsClient,
        this.allPrivateLocations ?? [],
        spaceId
      );

      const [monitorSavedObjectN, [packagePolicyResult, syncErrors]] = await Promise.all([
        newMonitorPromise,
        syncErrorsPromise,
      ]).catch((e) => {
        server.logger.error(e);
        throw e;
      });

      if (packagePolicyResult && (packagePolicyResult?.failed?.length ?? []) > 0) {
        const failed = packagePolicyResult.failed.map((f) => f.error);
        throw new Error(failed.join(', '));
      }

      monitorSavedObject = monitorSavedObjectN;

      sendTelemetryEvents(
        server.logger,
        server.telemetry,
        formatTelemetryEvent({
          errors: syncErrors,
          monitor: monitorSavedObject,
          isInlineScript: Boolean((normalizedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
          stackVersion: server.stackVersion,
        })
      );

      return {
        errors: syncErrors,
        newMonitor: {
          ...monitorSavedObject,
          attributes: { ...monitorWithNamespace, ...monitorSavedObject.attributes },
        },
      };
    } catch (e) {
      server.logger.error(
        `Unable to create Synthetics monitor ${monitorWithNamespace[ConfigKey.NAME]}`
      );
      await this.revertMonitorIfCreated({
        newMonitorId,
      });

      server.logger.error(e);

      throw e;
    }
  }

  async createNewSavedObjectMonitor({
    id,
    savedObjectsClient,
    normalizedMonitor,
  }: {
    id: string;
    savedObjectsClient: SavedObjectsClientContract;
    normalizedMonitor: SyntheticsMonitor;
  }) {
    return await savedObjectsClient.create<EncryptedSyntheticsMonitorAttributes>(
      syntheticsMonitorType,
      formatSecrets({
        ...normalizedMonitor,
        [ConfigKey.MONITOR_QUERY_ID]: normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || id,
        [ConfigKey.CONFIG_ID]: id,
        revision: 1,
      }),
      id
        ? {
            id,
            overwrite: true,
          }
        : undefined
    );
  }

  validateMonitorType(monitorFields: MonitorFields, previousMonitor?: MonitorFields) {
    const { [ConfigKey.MONITOR_TYPE]: monitorType } = monitorFields;
    if (previousMonitor) {
      const { [ConfigKey.MONITOR_TYPE]: prevMonitorType } = previousMonitor;

      if (monitorType !== prevMonitorType) {
        // monitor type cannot be changed
        throw new MonitorValidationError({
          valid: false,
          reason: i18n.translate('xpack.synthetics.createMonitor.validation.monitorTypeChanged', {
            defaultMessage:
              'Monitor type cannot be changed from {prevMonitorType} to {monitorType}.',
            values: {
              prevMonitorType,
              monitorType,
            },
          }),
          details: '',
          payload: monitorFields,
        });
      }
    }
  }

  async normalizeMonitor(
    requestPayload: CreateMonitorPayLoad,
    monitorPayload: CreateMonitorPayLoad,
    prevLocations?: MonitorFields['locations']
  ) {
    const { savedObjectsClient, syntheticsMonitorClient, request } = this.routeContext;
    const ui = Boolean((request.query as { ui?: boolean })?.ui);
    const {
      locations,
      private_locations: privateLocations,
      schedule,
      retest_on_failure: retestOnFailure,
      url: rawUrl,
      host: rawHost,
      ...rest
    } = requestPayload;
    const monitor = rest as MonitorFields;

    const monitorType = monitor[ConfigKey.MONITOR_TYPE];
    if (monitorType === MonitorTypeEnum.HTTP && !monitor.name) {
      monitor.name = monitor.urls;
    }

    const defaultFields = DEFAULT_FIELDS[monitorType];

    let locationsVal: MonitorFields['locations'] = [];

    if (!locations && !privateLocations && prevLocations) {
      locationsVal = prevLocations;
    } else {
      const monitorLocations = parseMonitorLocations(monitorPayload, prevLocations, ui);

      if (monitorLocations.privateLocations.length > 0) {
        this.allPrivateLocations = await getPrivateLocations(savedObjectsClient);
      } else {
        this.allPrivateLocations = [];
      }

      locationsVal = getMonitorLocations({
        monitorLocations,
        allPublicLocations: syntheticsMonitorClient.syntheticsService.locations,
        allPrivateLocations: this.allPrivateLocations,
      });
    }

    return {
      ...DEFAULT_FIELDS[monitorType],
      ...monitor,
      [ConfigKey.SCHEDULE]: getMonitorSchedule(schedule ?? defaultFields[ConfigKey.SCHEDULE]),
      [ConfigKey.MAX_ATTEMPTS]: getMaxAttempts(retestOnFailure, monitor[ConfigKey.MAX_ATTEMPTS]),
      [ConfigKey.LOCATIONS]: locationsVal,
    } as MonitorFields;
  }

  async validateUniqueMonitorName(name: string, id?: string) {
    const { savedObjectsClient } = this.routeContext;
    const kqlFilter = getKqlFilter({ field: 'name.keyword', values: name });
    const { total } = await savedObjectsClient.find({
      perPage: 0,
      type: syntheticsMonitorType,
      filter: id ? `${kqlFilter} and not (${monitorAttributes}.config_id: ${id})` : kqlFilter,
    });

    if (total > 0) {
      return i18n.translate('xpack.synthetics.createMonitor.validation.uniqueName', {
        defaultMessage: 'Monitor name must be unique, "{name}" already exists.',
        values: { name },
      });
    }
  }

  initDefaultAlerts(name: string) {
    const { server, savedObjectsClient, context } = this.routeContext;
    try {
      // we do this async, so we don't block the user, error handling will be done on the UI via separate api
      const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
      defaultAlertService
        .setupDefaultAlerts()
        .then(() => {
          server.logger.debug(`Successfully created default alert for monitor: ${name}`);
        })
        .catch((error) => {
          server.logger.error(`Error creating default alert: ${error} for monitor: ${name}`);
        });
    } catch (e) {
      server.logger.error(`Error creating default alert: ${e} for monitor: ${name}`);
    }
  }

  setupGettingStarted = (configId: string) => {
    const { server, request } = this.routeContext;

    try {
      const { gettingStarted } = request.query;

      if (gettingStarted) {
        // ignore await, since we don't want to block the response
        triggerTestNow(configId, this.routeContext)
          .then(() => {
            server.logger.debug(`Successfully triggered test for monitor: ${configId}`);
          })
          .catch((e) => {
            server.logger.error(`Error triggering test for monitor: ${configId}: ${e}`);
          });
      }
    } catch (e) {
      server.logger.info(`Error triggering test for getting started monitor: ${configId}`);
      server.logger.error(e);
    }
  };

  hydrateMonitorFields({
    newMonitorId,
    normalizedMonitor,
  }: {
    newMonitorId: string;
    normalizedMonitor: SyntheticsMonitor;
  }) {
    const { request } = this.routeContext;

    const { preserve_namespace: preserveNamespace } = request.query as Record<
      string,
      { preserve_namespace?: boolean }
    >;
    return {
      ...normalizedMonitor,
      [ConfigKey.MONITOR_QUERY_ID]:
        normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || newMonitorId,
      [ConfigKey.CONFIG_ID]: newMonitorId,
      [ConfigKey.NAMESPACE]: preserveNamespace
        ? normalizedMonitor[ConfigKey.NAMESPACE]
        : this.getMonitorNamespace(normalizedMonitor[ConfigKey.NAMESPACE]),
    };
  }

  getMonitorNamespace(configuredNamespace: string) {
    const { spaceId } = this.routeContext;
    const kibanaNamespace = formatKibanaNamespace(spaceId);
    const namespace =
      configuredNamespace === DEFAULT_NAMESPACE_STRING ? kibanaNamespace : configuredNamespace;
    const { error } = isValidNamespace(namespace);
    if (error) {
      throw new Error(`Cannot save monitor. Monitor namespace is invalid: ${error}`);
    }
    return namespace;
  }

  async revertMonitorIfCreated({ newMonitorId }: { newMonitorId: string }) {
    const { server, savedObjectsClient } = this.routeContext;
    try {
      const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
        syntheticsMonitorType,
        newMonitorId
      );
      if (encryptedMonitor) {
        await savedObjectsClient.delete(syntheticsMonitorType, newMonitorId);

        await deleteMonitor({
          routeContext: this.routeContext,
          monitorId: newMonitorId,
        });
      }
    } catch (e) {
      // ignore errors here
      server.logger.error(e);
    }
  }
}
