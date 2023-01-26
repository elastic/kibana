/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidV4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import {
  SavedObject,
  SavedObjectsClientContract,
  KibanaRequest,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitor,
  PrivateLocation,
} from '../../../common/runtime_types';
import { formatKibanaNamespace } from '../../../common/formatters';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import {
  DEFAULT_FIELDS,
  DEFAULT_NAMESPACE_STRING,
} from '../../../common/constants/monitor_defaults';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { validateMonitor } from './monitor_validation';
import { sendTelemetryEvents, formatTelemetryEvent } from '../telemetry/monitor_upgrade_sender';
import { formatSecrets } from '../../synthetics_service/utils/secrets';
import type { UptimeServerSetup } from '../../legacy_uptime/lib/adapters/framework';
import { deleteMonitor } from './delete_monitor';
import { StatusAlertService } from '../default_alerts/status_alert_service';

export const addSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    body: schema.any(),
    query: schema.object({
      id: schema.maybe(schema.string()),
      preserve_namespace: schema.maybe(schema.boolean()),
    }),
  },
  handler: async ({
    context,
    request,
    response,
    savedObjectsClient,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    // usually id is auto generated, but this is useful for testing
    const { id } = request.query;

    const monitor: SyntheticsMonitor = request.body as SyntheticsMonitor;
    const monitorType = monitor[ConfigKey.MONITOR_TYPE];
    const monitorWithDefaults = {
      ...DEFAULT_FIELDS[monitorType],
      ...monitor,
    };

    const validationResult = validateMonitor(monitorWithDefaults as MonitorFields);

    if (!validationResult.valid || !validationResult.decodedMonitor) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const privateLocations: PrivateLocation[] = await getSyntheticsPrivateLocations(
      savedObjectsClient
    );

    try {
      const { id: spaceId } = await server.spaces.spacesService.getActiveSpace(request);
      const { errors, newMonitor } = await syncNewMonitor({
        normalizedMonitor: validationResult.decodedMonitor,
        server,
        syntheticsMonitorClient,
        savedObjectsClient,
        request,
        id,
        privateLocations,
        spaceId,
      });

      if (errors && errors.length > 0) {
        return response.ok({
          body: {
            message: 'error pushing monitor to the service',
            attributes: { errors },
            id: newMonitor.id,
          },
        });
      }

      try {
        // we do this async, so we don't block the user, error handling will be done on the UI via separate api
        const statusAlertService = new StatusAlertService(context, server, savedObjectsClient);
        statusAlertService.createDefaultAlertIfNotExist().then(() => {
          server.logger.debug(
            `Successfully created default alert for monitor: ${newMonitor.attributes.name}`
          );
        });
      } catch (e) {
        server.logger.error(
          `Error creating default alert: ${e} for monitor: ${newMonitor.attributes.name}`
        );
      }

      return response.ok({ body: newMonitor });
    } catch (getErr) {
      server.logger.error(getErr);
      if (SavedObjectsErrorHelpers.isForbiddenError(getErr)) {
        return response.forbidden({ body: getErr });
      }

      return response.customError({
        body: { message: 'Unable to create monitor' },
        statusCode: 500,
      });
    }
  },
});

export const createNewSavedObjectMonitor = async ({
  id,
  savedObjectsClient,
  normalizedMonitor,
}: {
  id: string;
  savedObjectsClient: SavedObjectsClientContract;
  normalizedMonitor: SyntheticsMonitor;
}) => {
  return await savedObjectsClient.create<EncryptedSyntheticsMonitor>(
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
};

export const syncNewMonitor = async ({
  id,
  server,
  syntheticsMonitorClient,
  savedObjectsClient,
  request,
  normalizedMonitor,
  privateLocations,
  spaceId,
}: {
  id?: string;
  normalizedMonitor: SyntheticsMonitor;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  savedObjectsClient: SavedObjectsClientContract;
  request: KibanaRequest;
  privateLocations: PrivateLocation[];
  spaceId: string;
}) => {
  const newMonitorId = id ?? uuidV4();
  const { preserve_namespace: preserveNamespace } = request.query as Record<
    string,
    { preserve_namespace?: boolean }
  >;

  let monitorSavedObject: SavedObject<EncryptedSyntheticsMonitor> | null = null;
  const monitorWithNamespace = {
    ...normalizedMonitor,
    [ConfigKey.MONITOR_QUERY_ID]: normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || newMonitorId,
    [ConfigKey.CONFIG_ID]: newMonitorId,
    [ConfigKey.NAMESPACE]: preserveNamespace
      ? normalizedMonitor[ConfigKey.NAMESPACE]
      : getMonitorNamespace(server, request, normalizedMonitor[ConfigKey.NAMESPACE]),
  };

  try {
    const newMonitorPromise = createNewSavedObjectMonitor({
      normalizedMonitor: monitorWithNamespace,
      id: newMonitorId,
      savedObjectsClient,
    });

    const syncErrorsPromise = syntheticsMonitorClient.addMonitors(
      [{ monitor: monitorWithNamespace as MonitorFields, id: newMonitorId }],
      request,
      savedObjectsClient,
      privateLocations,
      spaceId
    );

    const [monitorSavedObjectN, { syncErrors }] = await Promise.all([
      newMonitorPromise,
      syncErrorsPromise,
    ]);

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

    return { errors: syncErrors, newMonitor: monitorSavedObject };
  } catch (e) {
    if (monitorSavedObject?.id) {
      await deleteMonitor({
        savedObjectsClient,
        server,
        monitorId: newMonitorId,
        syntheticsMonitorClient,
        request,
      });
    }
    server.logger.error(e);

    throw e;
  }
};

export const getMonitorNamespace = (
  server: UptimeServerSetup,
  request: KibanaRequest,
  configuredNamespace: string
) => {
  const spaceId = server.spaces.spacesService.getSpaceId(request);
  const kibanaNamespace = formatKibanaNamespace(spaceId);
  const namespace =
    configuredNamespace === DEFAULT_NAMESPACE_STRING ? kibanaNamespace : configuredNamespace;
  const { error } = isValidNamespace(namespace);
  if (error) {
    throw new Error(`Cannot save monitor. Monitor namespace is invalid: ${error}`);
  }
  return namespace;
};
