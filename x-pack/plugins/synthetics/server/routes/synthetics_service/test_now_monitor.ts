/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { TestNowResponse } from '../../../common/types';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { formatHeartbeatRequest } from '../../synthetics_service/formatters/format_configs';
import { normalizeSecrets } from '../../synthetics_service/utils/secrets';

export const testNowMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.TRIGGER_MONITOR + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({ request, server, syntheticsMonitorClient }): Promise<any> => {
    const { monitorId } = request.params;
    const encryptedClient = server.encryptedSavedObjects.getClient();

    const monitorWithSecrets =
      await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
        syntheticsMonitorType,
        monitorId
      );
    const normalizedMonitor = normalizeSecrets(monitorWithSecrets);

    const { [ConfigKey.SCHEDULE]: schedule, [ConfigKey.LOCATIONS]: locations } =
      monitorWithSecrets.attributes;

    const { syntheticsService } = syntheticsMonitorClient;

    const testRunId = uuidv4();

    const spaceId = server.spaces.spacesService.getSpaceId(request);

    const paramsBySpace = await syntheticsService.getSyntheticsParams({ spaceId });

    const errors = await syntheticsService.runOnceConfigs([
      formatHeartbeatRequest({
        // making it enabled, even if it's disabled in the UI
        monitor: { ...normalizedMonitor.attributes, enabled: true },
        monitorId,
        heartbeatId: (normalizedMonitor.attributes as MonitorFields)[ConfigKey.MONITOR_QUERY_ID],
        testRunId,
        params: paramsBySpace[spaceId],
      }),
    ]);

    if (errors && errors?.length > 0) {
      return {
        errors,
        testRunId,
        schedule,
        locations,
        configId: monitorId,
        monitor: normalizedMonitor.attributes,
      } as TestNowResponse;
    }

    return {
      testRunId,
      schedule,
      locations,
      configId: monitorId,
      monitor: normalizedMonitor.attributes,
    } as TestNowResponse;
  },
});
