/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsUpdateResponse } from 'kibana/server';
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';
import { MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { validateMonitor } from './monitor_validation';
import { getMonitorNotFoundResponse } from './service_errors';

// Simplify return promise type and type it with runtime_types
export const editSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string(),
    }),
    body: schema.any(),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const monitor = request.body as SyntheticsMonitor;

    const validationResult = validateMonitor(monitor as MonitorFields);

    if (!validationResult.valid) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const { monitorId } = request.params;

    const { syntheticsService } = server;

    try {
      const editMonitor: SavedObjectsUpdateResponse<MonitorFields> =
        await savedObjectsClient.update(syntheticsMonitorType, monitorId, monitor);

      const errors = await syntheticsService.pushConfigs(request, [
        {
          ...(editMonitor.attributes as SyntheticsMonitor),
          id: editMonitor.id,
          fields: {
            config_id: editMonitor.id,
          },
          fields_under_root: true,
        },
      ]);

      // Return service sync errors in OK response
      if (errors) {
        return errors;
      }

      return editMonitor;
    } catch (updateErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(updateErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw updateErr;
    }
  },
});
