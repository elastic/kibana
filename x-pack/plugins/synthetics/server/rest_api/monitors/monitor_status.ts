/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UMServerLibs } from '../../lib/lib';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';

export const createGetStatusBarRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: API_URLS.MONITOR_STATUS,
  validate: {
    query: schema.object({
      monitorId: schema.string(),
      dateStart: schema.string(),
      dateEnd: schema.string(),
    }),
  },
  handler: async ({ uptimeEsClient, request, server, savedObjectsClient }): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query;
    const encryptedSavedObjectsClient = server.encryptedSavedObjects.getClient();

    const latestMonitor = await libs.requests.getLatestMonitor({
      uptimeEsClient,
      monitorId,
      dateStart,
      dateEnd,
    });

    if (latestMonitor.docId) {
      return latestMonitor;
    }

    if (!server.savedObjectsClient) {
      return null;
    }

    try {
      const monitorSavedObject = await libs.requests.getSyntheticsMonitor({
        monitorId,
        encryptedSavedObjectsClient,
        savedObjectsClient,
      });

      if (!monitorSavedObject) {
        return null;
      }

      const {
        [ConfigKey.URLS]: url,
        [ConfigKey.NAME]: name,
        [ConfigKey.HOSTS]: host,
        [ConfigKey.MONITOR_TYPE]: type,
      } = monitorSavedObject.attributes as Partial<MonitorFields>;

      return {
        url: {
          full: url || host,
        },
        monitor: {
          name,
          type,
          id: monitorSavedObject.id,
        },
      };
    } catch (e) {
      server.logger.error(e);
    }
  },
});
