/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { UMRestApiRouteFactory } from '../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';

const queryParams = schema.object({
  monitorId: schema.string(),
  dateStart: schema.string(),
  dateEnd: schema.string(),
});

type QueryParams = TypeOf<typeof queryParams>;

export const createGetMonitorStatusRoute: UMRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.MONITOR_STATUS,
  validate: {
    query: queryParams,
  },
  handler: async ({ uptimeEsClient, request, server, savedObjectsClient }): Promise<any> => {
    const { monitorId, dateStart, dateEnd } = request.query as QueryParams;

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
      const {
        saved_objects: [monitorSavedObject],
      } = await savedObjectsClient.find({
        type: syntheticsMonitorType,
        perPage: 1,
        page: 1,
        filter: `${syntheticsMonitorType}.id: "${syntheticsMonitorType}:${monitorId}" OR ${syntheticsMonitorType}.attributes.${ConfigKey.CUSTOM_HEARTBEAT_ID}: "${monitorId}"`,
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
