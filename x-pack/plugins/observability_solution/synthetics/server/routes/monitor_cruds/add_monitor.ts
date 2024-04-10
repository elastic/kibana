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
import { DefaultAlertService } from '../default_alerts/default_alert_service';
import { triggerTestNow } from '../synthetics_service/test_now_monitor';
import { SyntheticsServerSetup } from '../../types';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
  EncryptedSyntheticsMonitorAttributes,
} from '../../../common/runtime_types';
import { formatKibanaNamespace } from '../../synthetics_service/formatters/private_formatters';
import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  DEFAULT_FIELDS,
  DEFAULT_NAMESPACE_STRING,
} from '../../../common/constants/monitor_defaults';
import { validateMonitor } from './monitor_validation';
import { sendTelemetryEvents, formatTelemetryEvent } from '../telemetry/monitor_upgrade_sender';
import { formatSecrets } from '../../synthetics_service/utils/secrets';
import { deleteMonitor } from './delete_monitor';
import { mapSavedObjectToMonitor } from './helper';

export const addSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS,
  validate: {
    body: schema.any(),
    query: schema.object({
      id: schema.maybe(schema.string()),
      preserve_namespace: schema.maybe(schema.boolean()),
      gettingStarted: schema.maybe(schema.boolean()),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, savedObjectsClient, server } = routeContext;
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

    const privateLocations: PrivateLocationAttributes[] = await getPrivateLocationsForMonitor(
      savedObjectsClient,
      normalizedMonitor
    );

    try {
      const { errors, newMonitor } = await syncNewMonitor({
        normalizedMonitor,
        routeContext,
        id,
        privateLocations,
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
      initDefaultAlerts(newMonitor.attributes.name, routeContext);
      setupGettingStarted(newMonitor.id, routeContext);

      return response.ok({ body: mapSavedObjectToMonitor(newMonitor) });
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
};

export const hydrateMonitorFields = ({
  newMonitorId,
  normalizedMonitor,
  routeContext,
}: {
  newMonitorId: string;
  normalizedMonitor: SyntheticsMonitor;
  routeContext: RouteContext;
}) => {
  const { server, request } = routeContext;

  const { preserve_namespace: preserveNamespace } = request.query as Record<
    string,
    { preserve_namespace?: boolean }
  >;
  return {
    ...normalizedMonitor,
    [ConfigKey.MONITOR_QUERY_ID]: normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || newMonitorId,
    [ConfigKey.CONFIG_ID]: newMonitorId,
    [ConfigKey.NAMESPACE]: preserveNamespace
      ? normalizedMonitor[ConfigKey.NAMESPACE]
      : getMonitorNamespace(server, request, normalizedMonitor[ConfigKey.NAMESPACE]),
  };
};

export const syncNewMonitor = async ({
  id,
  normalizedMonitor,
  privateLocations,
  routeContext,
}: {
  id?: string;
  normalizedMonitor: SyntheticsMonitor;
  routeContext: RouteContext;
  privateLocations: PrivateLocationAttributes[];
}) => {
  const { savedObjectsClient, server, syntheticsMonitorClient, spaceId } = routeContext;
  const newMonitorId = id ?? uuidV4();

  let monitorSavedObject: SavedObject<EncryptedSyntheticsMonitorAttributes> | null = null;
  const monitorWithNamespace = hydrateMonitorFields({
    normalizedMonitor,
    routeContext,
    newMonitorId,
  });

  try {
    const newMonitorPromise = createNewSavedObjectMonitor({
      normalizedMonitor: monitorWithNamespace,
      id: newMonitorId,
      savedObjectsClient,
    });

    const syncErrorsPromise = syntheticsMonitorClient.addMonitors(
      [{ monitor: monitorWithNamespace as MonitorFields, id: newMonitorId }],
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
    const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
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

export const getPrivateLocationsForMonitor = async (
  soClient: SavedObjectsClientContract,
  normalizedMonitor: SyntheticsMonitor
) => {
  const { locations } = normalizedMonitor;
  const hasPrivateLocation = locations.filter((location) => !location.isServiceManaged);
  if (hasPrivateLocation.length === 0) {
    return [];
  }
  return await getPrivateLocations(soClient);
};

export const getMonitorNamespace = (
  server: SyntheticsServerSetup,
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

const initDefaultAlerts = (name: string, routeContext: RouteContext) => {
  const { server, savedObjectsClient, context } = routeContext;
  try {
    // we do this async, so we don't block the user, error handling will be done on the UI via separate api
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
    defaultAlertService.setupDefaultAlerts().then(() => {
      server.logger.debug(`Successfully created default alert for monitor: ${name}`);
    });
  } catch (e) {
    server.logger.error(`Error creating default alert: ${e} for monitor: ${name}`);
  }
};

const setupGettingStarted = (configId: string, routeContext: RouteContext) => {
  const { server, request } = routeContext;

  try {
    const { gettingStarted } = request.query;

    if (gettingStarted) {
      // ignore await, since we don't want to block the response
      triggerTestNow(configId, routeContext)
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
