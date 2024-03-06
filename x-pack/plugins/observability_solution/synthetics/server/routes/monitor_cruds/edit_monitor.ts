/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ELASTIC_MANAGED_LOCATIONS_DISABLED } from './add_monitor_project';
import { getDecryptedMonitor } from '../../saved_objects/synthetics_monitor';
import { getPrivateLocations } from '../../synthetics_service/get_private_locations';
import { mergeSourceMonitor } from './helper';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import {
  MonitorFields,
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitorWithSecretsAttributes,
  SyntheticsMonitor,
  ConfigKey,
  MonitorLocations,
} from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { validateMonitor } from './monitor_validation';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  sendTelemetryEvents,
  formatTelemetryUpdateEvent,
} from '../telemetry/monitor_upgrade_sender';
import { formatSecrets, normalizeSecrets } from '../../synthetics_service/utils/secrets';
import { mapSavedObjectToMonitor } from './helper';

// Simplify return promise type and type it with runtime_types
export const editSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string(),
    }),
    body: schema.any(),
  },
  handler: async (routeContext): Promise<any> => {
    const { request, response, savedObjectsClient, server } = routeContext;
    const { logger } = server;
    const monitor = request.body as SyntheticsMonitor;
    const { monitorId } = request.params;

    try {
      const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

      const previousMonitor: SavedObject<EncryptedSyntheticsMonitorAttributes> =
        await savedObjectsClient.get(syntheticsMonitorType, monitorId);

      /* Decrypting the previous monitor before editing ensures that all existing fields remain
       * on the object, even in flows where decryption does not take place, such as the enabled tab
       * on the monitor list table. We do not decrypt monitors in bulk for the monitor list table */
      const decryptedPreviousMonitor = await getDecryptedMonitor(
        server,
        monitorId,
        previousMonitor.namespaces?.[0]!
      );
      const normalizedPreviousMonitor = normalizeSecrets(decryptedPreviousMonitor).attributes;

      const editedMonitor = mergeSourceMonitor(normalizedPreviousMonitor, monitor);

      const validationResult = validateMonitor(editedMonitor as MonitorFields);

      if (!validationResult.valid || !validationResult.decodedMonitor) {
        const { reason: message, details, payload } = validationResult;
        return response.badRequest({ body: { message, attributes: { details, ...payload } } });
      }

      const err = await validatePermissions(routeContext, editedMonitor.locations);
      if (err) {
        return response.forbidden({
          body: {
            message: err,
          },
        });
      }

      const monitorWithRevision = {
        ...validationResult.decodedMonitor,
        /* reset config hash to empty string. Ensures that the synthetics agent is able
         * to update project monitors on when next pushed after they are edited via the UI,
         * through the enable/disable monitor toggle */
        [ConfigKey.CONFIG_HASH]: '',
        revision: (previousMonitor.attributes[ConfigKey.REVISION] || 0) + 1,
      };

      const {
        publicSyncErrors,
        failedPolicyUpdates,
        editedMonitor: editedMonitorSavedObject,
      } = await syncEditedMonitor({
        routeContext,
        previousMonitor,
        decryptedPreviousMonitor,
        normalizedMonitor: monitorWithRevision,
        spaceId,
      });
      if (failedPolicyUpdates && failedPolicyUpdates.length > 0) {
        const hasError = failedPolicyUpdates.find((update) => update.error);
        await rollbackUpdate({
          routeContext,
          configId: monitorId,
          attributes: decryptedPreviousMonitor.attributes,
        });
        throw hasError?.error;
      }

      // Return service sync errors in OK response
      if (publicSyncErrors && publicSyncErrors.length > 0) {
        return response.ok({
          body: {
            message: 'error pushing monitor to the service',
            attributes: { errors: publicSyncErrors },
          },
        });
      }

      return mapSavedObjectToMonitor(
        editedMonitorSavedObject as SavedObject<EncryptedSyntheticsMonitorAttributes>
      );
    } catch (updateErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(updateErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }
      logger.error(updateErr);

      return response.customError({
        body: { message: updateErr.message },
        statusCode: 500,
      });
    }
  },
});

const rollbackUpdate = async ({
  routeContext,
  configId,
  attributes,
}: {
  attributes: SyntheticsMonitorWithSecretsAttributes;
  configId: string;
  routeContext: RouteContext;
}) => {
  const { savedObjectsClient, server } = routeContext;
  try {
    await savedObjectsClient.update<MonitorFields>(syntheticsMonitorType, configId, attributes);
  } catch (e) {
    server.logger.error(`Unable to rollback Synthetics monitors edit ${e.message} `);
  }
};

export const syncEditedMonitor = async ({
  normalizedMonitor,
  previousMonitor,
  decryptedPreviousMonitor,
  spaceId,
  routeContext,
}: {
  normalizedMonitor: SyntheticsMonitor;
  previousMonitor: SavedObject<EncryptedSyntheticsMonitorAttributes>;
  decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
  routeContext: RouteContext;
  spaceId: string;
}) => {
  const { server, savedObjectsClient, syntheticsMonitorClient } = routeContext;
  try {
    const monitorWithId = {
      ...normalizedMonitor,
      [ConfigKey.MONITOR_QUERY_ID]:
        normalizedMonitor[ConfigKey.CUSTOM_HEARTBEAT_ID] || previousMonitor.id,
      [ConfigKey.CONFIG_ID]: previousMonitor.id,
    };
    const formattedMonitor = formatSecrets(monitorWithId);

    const editedSOPromise = savedObjectsClient.update<MonitorFields>(
      syntheticsMonitorType,
      previousMonitor.id,
      formattedMonitor
    );

    const allPrivateLocations = await getPrivateLocations(savedObjectsClient);

    const editSyncPromise = syntheticsMonitorClient.editMonitors(
      [
        {
          monitor: monitorWithId as MonitorFields,
          id: previousMonitor.id,
          previousMonitor,
          decryptedPreviousMonitor,
        },
      ],
      routeContext,
      allPrivateLocations,
      spaceId
    );

    const [editedMonitorSavedObject, { publicSyncErrors, failedPolicyUpdates }] = await Promise.all(
      [editedSOPromise, editSyncPromise]
    ).catch((e) => {
      server.logger.error(e);
      throw e;
    });

    sendTelemetryEvents(
      server.logger,
      server.telemetry,
      formatTelemetryUpdateEvent(
        editedMonitorSavedObject as SavedObjectsUpdateResponse<EncryptedSyntheticsMonitorAttributes>,
        previousMonitor,
        server.stackVersion,
        Boolean((normalizedMonitor as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        publicSyncErrors
      )
    );

    return {
      failedPolicyUpdates,
      publicSyncErrors,
      editedMonitor: editedMonitorSavedObject,
    };
  } catch (e) {
    server.logger.error(
      `Unable to update Synthetics monitor ${decryptedPreviousMonitor.attributes[ConfigKey.NAME]}`
    );
    await rollbackUpdate({
      routeContext,
      configId: previousMonitor.id,
      attributes: decryptedPreviousMonitor.attributes,
    });

    throw e;
  }
};

export const validatePermissions = async (
  { server, response, request }: RouteContext,
  monitorLocations: MonitorLocations
) => {
  const hasPublicLocations = monitorLocations?.some((loc) => loc.isServiceManaged);
  if (!hasPublicLocations) {
    return;
  }

  const elasticManagedLocationsEnabled =
    Boolean(
      (
        await server.coreStart?.capabilities.resolveCapabilities(request, {
          capabilityPath: 'uptime.*',
        })
      ).uptime.elasticManagedLocationsEnabled
    ) ?? true;
  if (!elasticManagedLocationsEnabled) {
    return ELASTIC_MANAGED_LOCATIONS_DISABLED;
  }
};
