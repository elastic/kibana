/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { getMonitorNotFoundResponse } from './service_errors';
import { MonitorFields } from '../../../common/runtime_types';

export const triggerNowSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.TRIGGER_NOW_MONITOR + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, savedObjectsClient, response, server }): Promise<any> => {
    const { monitorId } = request.params;

    try {
      const monitor = await savedObjectsClient.get(syntheticsMonitorType, monitorId);
      const { syntheticsService } = server;

      const errors = await syntheticsService.runOnceConfigs(request, [
        { ...(monitor.attributes as MonitorFields), id: monitorId },
      ]);

      if (errors) {
        return errors;
      }

      return monitor;
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});
