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
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { getSyntheticsPrivateLocations } from '../../legacy_uptime/lib/saved_objects/private_locations';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitor,
  PrivateLocation,
} from '../../../common/runtime_types';
import { formatKibanaNamespace } from '../../../common/formatters';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import {
  DEFAULT_FIELDS,
  DEFAULT_NAMESPACE_STRING,
} from '../../../common/constants/monitor_defaults';
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
  writeAccess: true,
  handler: async (routeContext): Promise<any> => {
    const { context, request, response, savedObjectsClient, server } = routeContext;
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

    const normalizedMonitor = validationResult.decodedMonitor;

    const privateLocations: PrivateLocation[] = await getPrivateLocations(
      savedObjectsClient,
      normalizedMonitor
    );

    try {
      const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
      const { errors, newMonitor } = await syncNewMonitor({
        normalizedMonitor,
        routeContext,
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
        body: { message: getErr.message },
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
  normalizedMonitor,
  privateLocations,
  spaceId,
  routeContext,
}: {
  id?: string;
  normalizedMonitor: SyntheticsMonitor;
  routeContext: RouteContext;
  privateLocations: PrivateLocation[];
  spaceId: string;
}) => {
  const { savedObjectsClient, server, syntheticsMonitorClient, request } = routeContext;
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

    return { errors: syncErrors, newMonitor: monitorSavedObject };
  } catch (e) {
    server.logger.error(
      `Unable to create Synthetics monitor ${monitorWithNamespace[ConfigKey.NAME]}`
    );
    await deleteMonitorIfCreated({
      newMonitorId,
      routeContext,
    });

    server.logger.error(e);

    throw e;
  }
};

export const deleteMonitorIfCreated = async ({
  newMonitorId,
  routeContext,
}: {
  routeContext: RouteContext;
  newMonitorId: string;
}) => {
  const { server, savedObjectsClient } = routeContext;
  try {
    const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitor>(
      syntheticsMonitorType,
      newMonitorId
    );
    if (encryptedMonitor) {
      await savedObjectsClient.delete(syntheticsMonitorType, newMonitorId);

      await deleteMonitor({
        routeContext,
        monitorId: newMonitorId,
      });
    }
  } catch (e) {
    // ignore errors here
    server.logger.error(e);
  }
};

const getPrivateLocations = async (
  soClient: SavedObjectsClientContract,
  normalizedMonitor: SyntheticsMonitor
) => {
  const { locations } = normalizedMonitor;
  const hasPrivateLocation = locations.filter((location) => !location.isServiceManaged);
  if (hasPrivateLocation.length === 0) {
    return [];
  }
  return await getSyntheticsPrivateLocations(soClient);
};

const getMonitorNamespace = (
  server: UptimeServerSetup,
  request: KibanaRequest,
  configuredNamespace: string
) => {
  const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
  const kibanaNamespace = formatKibanaNamespace(spaceId);
  const namespace =
    configuredNamespace === DEFAULT_NAMESPACE_STRING ? kibanaNamespace : configuredNamespace;
  const { error } = isValidNamespace(namespace);
  if (error) {
    throw new Error(`Cannot save monitor. Monitor namespace is invalid: ${error}`);
  }
  return namespace;
};
