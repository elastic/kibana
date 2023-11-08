/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { v4 as uuidv4 } from 'uuid';
import { getDecryptedMonitor } from '../../saved_objects/synthetics_monitor';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { getPrivateLocationsForMonitor } from '../monitor_cruds/add_monitor';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import { TestNowResponse } from '../../../common/types';
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';
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
  routeContext: RouteContext
): Promise<TestNowResponse> => {
  const { server, spaceId, syntheticsMonitorClient, savedObjectsClient } = routeContext;

  const monitorWithSecrets = await getDecryptedMonitor(server, monitorId, spaceId);
  const normalizedMonitor = normalizeSecrets(monitorWithSecrets);

  const { [ConfigKey.SCHEDULE]: schedule, [ConfigKey.LOCATIONS]: locations } =
    monitorWithSecrets.attributes;

  const privateLocations: PrivateLocationAttributes[] = await getPrivateLocationsForMonitor(
    savedObjectsClient,
    normalizedMonitor.attributes
  );
  const testRunId = uuidv4();

  const [, errors] = await syntheticsMonitorClient.testNowConfigs(
    {
      monitor: normalizedMonitor.attributes as MonitorFields,
      id: monitorId,
      testRunId,
    },
    savedObjectsClient,
    privateLocations,
    spaceId
  );

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
