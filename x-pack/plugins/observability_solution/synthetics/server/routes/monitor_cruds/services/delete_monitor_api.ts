/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { SavedObject, SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { deleteMonitorBulk } from '../bulk_cruds/delete_monitor_bulk';
import { validatePermissions } from '../edit_monitor';
import {
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../../common/types/saved_objects';
import { normalizeSecrets } from '../../../synthetics_service/utils';
import { sendErrorTelemetryEvents } from '../../telemetry/monitor_upgrade_sender';
import { RouteContext } from '../../types';

export class DeleteMonitorAPI {
  routeContext: RouteContext;
  result: Array<{ id: string; deleted: boolean; error?: string }> = [];
  constructor(routeContext: RouteContext) {
    this.routeContext = routeContext;
  }

  async getMonitorsToDelete(monitorIds: string[]) {
    const result: Array<SavedObject<SyntheticsMonitor | EncryptedSyntheticsMonitorAttributes>> = [];
    await pMap(
      monitorIds,
      async (monitorId) => {
        const monitor = await this.getMonitorToDelete(monitorId);
        if (monitor) {
          result.push(monitor);
        }
      },
      {
        stopOnError: false,
      }
    );
    return result;
  }

  async getMonitorToDelete(monitorId: string) {
    const { spaceId, savedObjectsClient, server } = this.routeContext;
    try {
      const encryptedSOClient = server.encryptedSavedObjects.getClient();

      const monitor =
        await encryptedSOClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
          syntheticsMonitorType,
          monitorId,
          {
            namespace: spaceId,
          }
        );
      return normalizeSecrets(monitor);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        this.result.push({
          id: monitorId,
          deleted: false,
          error: `Monitor id ${monitorId} not found!`,
        });
      } else {
        server.logger.error(`Failed to decrypt monitor to delete ${monitorId}${e}`);
        sendErrorTelemetryEvents(server.logger, server.telemetry, {
          reason: `Failed to decrypt monitor to delete ${monitorId}`,
          message: e?.message,
          type: 'deletionError',
          code: e?.code,
          status: e.status,
          stackVersion: server.stackVersion,
        });
        return await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
          syntheticsMonitorType,
          monitorId
        );
      }
    }
  }

  async execute({ monitorIds }: { monitorIds: string[] }) {
    const { response, server } = this.routeContext;

    const monitors = await this.getMonitorsToDelete(monitorIds);
    for (const monitor of monitors) {
      const err = await validatePermissions(this.routeContext, monitor.attributes.locations);
      if (err) {
        return {
          res: response.forbidden({
            body: {
              message: err,
            },
          }),
        };
      }
    }

    try {
      const { errors, result } = await deleteMonitorBulk({
        monitors,
        routeContext: this.routeContext,
      });

      result.statuses?.forEach((res) => {
        this.result.push({
          id: res.id,
          deleted: res.success,
        });
      });

      return { errors };
    } catch (e) {
      server.logger.error(`Unable to delete Synthetics monitor with error ${e.message}`);
      server.logger.error(e);
      throw e;
    }
  }
}
