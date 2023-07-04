/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { TestNowResponse } from '../../../common/types';
import {
  ConfigKey,
  MonitorFields,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { normalizeSecrets } from '../../synthetics_service/utils/secrets';

export const testNowMonitorRoute: SyntheticsRestApiRouteFactory<TestNowResponse> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.TRIGGER_MONITOR + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async (routeContext) => {
    const { monitorId } = routeContext.request.params;
    return triggerTestNow(monitorId, routeContext);
  },
});

export const triggerTestNow = async (
  monitorId: string,
  { server, spaceId, syntheticsMonitorClient }: RouteContext
): Promise<TestNowResponse> => {
  const encryptedClient = server.encryptedSavedObjects.getClient();

  const monitorWithSecrets =
    await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
      syntheticsMonitorType,
      monitorId,
      {
        namespace: spaceId,
      }
    );
  const normalizedMonitor = normalizeSecrets(monitorWithSecrets);

  const { [ConfigKey.SCHEDULE]: schedule, [ConfigKey.LOCATIONS]: locations } =
    monitorWithSecrets.attributes;

  const { syntheticsService } = syntheticsMonitorClient;

  const testRunId = uuidv4();

  const paramsBySpace = await syntheticsService.getSyntheticsParams({ spaceId });

  const errors = await syntheticsService.runOnceConfigs({
    // making it enabled, even if it's disabled in the UI
    monitor: { ...normalizedMonitor.attributes, enabled: true },
    configId: monitorId,
    heartbeatId: (normalizedMonitor.attributes as MonitorFields)[ConfigKey.MONITOR_QUERY_ID],
    testRunId,
    params: paramsBySpace[spaceId],
  });

  if (errors && errors?.length > 0) {
    return {
      errors,
      testRunId,
      schedule,
      locations,
      configId: monitorId,
      monitor: normalizedMonitor.attributes,
    };
  }

  return {
    testRunId,
    schedule,
    locations,
    configId: monitorId,
    monitor: normalizedMonitor.attributes,
  };
};
