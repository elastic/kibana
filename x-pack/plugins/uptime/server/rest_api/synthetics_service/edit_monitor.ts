/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { SyntheticsMonitorSavedObject } from '../../../common/types';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';

export const editSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string(),
    }),
    body: schema.any(),
  },
  handler: async ({ request, savedObjectsClient, server }): Promise<any> => {
    const monitor = request.body as SyntheticsMonitorSavedObject['attributes'];

    const { monitorId } = request.params;

    const { syntheticsService } = server;

    const editMonitor = await savedObjectsClient.update(syntheticsMonitorType, monitorId, monitor);

    const errors = await syntheticsService.pushConfigs(request, [
      {
        ...(editMonitor.attributes as SyntheticsMonitorSavedObject['attributes']),
        id: editMonitor.id,
      },
    ]);

    if (errors) {
      return errors;
    }

    return editMonitor;
  },
});
