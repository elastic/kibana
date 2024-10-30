/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { DeleteMonitorAPI } from './services/delete_monitor_api';
import { SyntheticsRestApiRouteFactory } from '../types';
import { DeleteParamsResponse } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const deleteSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory<
  DeleteParamsResponse[],
  Record<string, string>,
  Record<string, string>,
  { ids: string[] }
> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/{id?}',
  validate: {},
  validation: {
    request: {
      body: schema.nullable(
        schema.object({
          ids: schema.arrayOf(schema.string(), {
            minSize: 1,
          }),
        })
      ),
      params: schema.object({
        id: schema.maybe(schema.string()),
      }),
    },
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response } = routeContext;

    const { ids } = request.body || {};
    const { id: queryId } = request.params;

    if (ids && queryId) {
      return response.badRequest({
        body: { message: 'id must be provided either via param or body.' },
      });
    }

    const idsToDelete = [...(ids ?? []), ...(queryId ? [queryId] : [])];
    if (idsToDelete.length === 0) {
      return response.badRequest({
        body: { message: 'id must be provided via param or body.' },
      });
    }

    const deleteMonitorAPI = new DeleteMonitorAPI(routeContext);
    try {
      const { errors } = await deleteMonitorAPI.execute({
        monitorIds: idsToDelete,
      });

      if (errors && errors.length > 0) {
        return response.ok({
          body: { message: 'error pushing monitor to the service', attributes: { errors } },
        });
      }
    } catch (getErr) {
      throw getErr;
    }

    return deleteMonitorAPI.result;
  },
});

export const deleteMonitor = async ({
  routeContext,
  monitorId,
}: {
  routeContext: RouteContext;
  monitorId: string;
}) => {
  const { response, spaceId, savedObjectsClient, server, syntheticsMonitorClient } = routeContext;
  const { logger, telemetry, stackVersion } = server;

  const { monitor, monitorWithSecret } = await getMonitorToDelete(
    monitorId,
    savedObjectsClient,
    server,
    spaceId
  );

  const err = await validatePermissions(routeContext, monitor.attributes.locations);
  if (err) {
    return {
      res: response.forbidden({
        body: {
          message: err,
        },
      }),
    };
  }

  let deletePromise;

  try {
    deletePromise = savedObjectsClient.delete(syntheticsMonitorType, monitorId);

    const deleteSyncPromise = syntheticsMonitorClient.deleteMonitors(
      [
        {
          ...monitor.attributes,
          id: (monitor.attributes as MonitorFields)[ConfigKey.MONITOR_QUERY_ID],
        },
        /* Type cast encrypted saved objects to decrypted saved objects for delete flow only.
         * Deletion does not require all monitor fields */
      ] as SyntheticsMonitorWithId[],
      spaceId
    );

    const [errors] = await Promise.all([deleteSyncPromise, deletePromise]).catch((e) => {
      server.logger.error(e);
      throw e;
    });

    sendTelemetryEvents(
      logger,
      telemetry,
      formatTelemetryDeleteEvent(
        monitor,
        stackVersion,
        new Date().toISOString(),
        Boolean((monitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        errors
      )
    );

    return { errors };
  } catch (e) {
    if (deletePromise) {
      await deletePromise;
    }
    server.logger.error(
      `Unable to delete Synthetics monitor ${monitor.attributes[ConfigKey.NAME]}`
    );

    if (monitorWithSecret) {
      await restoreDeletedMonitor({
        monitorId,
        normalizedMonitor: formatSecrets({
          ...monitorWithSecret.attributes,
        }),
        savedObjectsClient,
      });
    }
    throw e;
  }
};

const getMonitorToDelete = async (
  monitorId: string,
  soClient: SavedObjectsClientContract,
  server: SyntheticsServerSetup,
  spaceId: string
) => {
  const encryptedSOClient = server.encryptedSavedObjects.getClient();

  try {
    const monitor =
      await encryptedSOClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        syntheticsMonitorType,
        monitorId,
        {
          namespace: spaceId,
        }
      );
    return { monitor: normalizeSecrets(monitor), monitorWithSecret: normalizeSecrets(monitor) };
  } catch (e) {
    server.logger.error(`Failed to decrypt monitor to delete ${monitorId}${e}`);
    sendErrorTelemetryEvents(server.logger, server.telemetry, {
      reason: `Failed to decrypt monitor to delete ${monitorId}`,
      message: e?.message,
      type: 'deletionError',
      code: e?.code,
      status: e.status,
      stackVersion: server.stackVersion,
    });
  }

  const monitor = await soClient.get<EncryptedSyntheticsMonitorAttributes>(
    syntheticsMonitorType,
    monitorId
  );
  return { monitor, withSecrets: false };
};

const restoreDeletedMonitor = async ({
  monitorId,
  savedObjectsClient,
  normalizedMonitor,
}: {
  monitorId: string;
  normalizedMonitor: SyntheticsMonitorWithSecretsAttributes;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  try {
    await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
      syntheticsMonitorType,
      monitorId
    );
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      await savedObjectsClient.create(syntheticsMonitorType, normalizedMonitor, {
        id: monitorId,
        overwrite: true,
      });
    }
  }
};
