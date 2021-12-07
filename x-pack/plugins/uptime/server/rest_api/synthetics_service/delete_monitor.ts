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
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { getMonitorNotFoundResponse } from './service_errors.ts';

export const deleteSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const { monitorId } = request.params;

    const { syntheticsService } = server;

    try {
      const monitor = await savedObjectsClient.get<SyntheticsMonitorSavedObject['attributes']>(
        syntheticsMonitorType,
        monitorId
      );

      await savedObjectsClient.delete(syntheticsMonitorType, monitorId);
      const errors = await syntheticsService.deleteConfigs(request, [
        { ...monitor.attributes, id: monitorId },
      ]);

      if (errors) {
        return errors;
      }

      return monitorId;
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});
