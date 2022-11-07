/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitor,
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
  handler: async ({
    request,
    savedObjectsClient,
    server,
    syntheticsMonitorClient,
  }): Promise<any> => {
    const { monitorId } = request.params;
    const monitor = await savedObjectsClient.get<SyntheticsMonitor>(
      syntheticsMonitorType,
      monitorId
    );

    const encryptedClient = server.encryptedSavedObjects.getClient();

    const monitorWithSecrets =
      await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
        syntheticsMonitorType,
        monitorId
      );
    const normalizedMonitor = normalizeSecrets(monitorWithSecrets);

    const { [ConfigKey.SCHEDULE]: schedule, [ConfigKey.LOCATIONS]: locations } = monitor.attributes;

    const { syntheticsService } = syntheticsMonitorClient;

    const testRunId = uuidv4();

    const errors = await syntheticsService.runOnceConfigs([
      formatHeartbeatRequest({
        // making it enabled, even if it's disabled in the UI
        monitor: { ...normalizedMonitor.attributes, enabled: true },
        monitorId,
        customHeartbeatId: (normalizedMonitor.attributes as MonitorFields)[
          ConfigKey.CUSTOM_HEARTBEAT_ID
        ],
        testRunId,
      }),
    ]);

    if (errors && errors?.length > 0) {
      return { errors, testRunId, monitorId, schedule, locations };
    }

    return { testRunId, monitorId, schedule, locations };
  },
});
