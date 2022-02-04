/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { SyntheticsMonitor } from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';

export const testNowMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.TRIGGER_MONITOR + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, savedObjectsClient, response, server }): Promise<any> => {
    const { monitorId } = request.params;
    const monitor = await savedObjectsClient.get<SyntheticsMonitor>(
      syntheticsMonitorType,
      monitorId
    );

    const { syntheticsService } = server;

    const testRunId = uuidv4();

    const errors = await syntheticsService.triggerConfigs(request, [
      {
        ...monitor.attributes,
        id: monitorId,
        fields_under_root: true,
        fields: { config_id: monitorId, test_run_id: testRunId },
      },
    ]);

    if (errors && errors?.length > 0) {
      return { errors, testRunId, monitorId };
    }

    return { testRunId, monitorId };
  },
});
