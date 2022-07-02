/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { TELEMETRY_CHANNEL_SAVED_QUERIES } from '../constants';
import { templateSavedQueries } from '../helpers';
import { TelemetryEventsSender } from '../sender';
import { TelemetryReceiver } from '../receiver';
import type { ESClusterInfo, ESLicense } from '../types';

export function createTelemetryConfigsTaskConfig() {
  return {
    type: 'osquery:telemetry-configs',
    title: 'Osquery Configs Telemetry',
    interval: '5m',
    timeout: '10m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: TelemetryReceiver,
      sender: TelemetryEventsSender
    ) => {
      const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
        receiver.fetchClusterInfo(),
        receiver.fetchLicenseInfo(),
      ]);

      const clusterInfo =
        clusterInfoPromise.status === 'fulfilled'
          ? clusterInfoPromise.value
          : ({} as ESClusterInfo);
      const licenseInfo =
        licenseInfoPromise.status === 'fulfilled'
          ? licenseInfoPromise.value
          : ({} as ESLicense | undefined);

      const configsResponse = await receiver.fetchConfigs();

      if (!configsResponse?.total) {
        logger.debug('no configs found');

        return 0;
      }

      const savedQueriesJson = templateSavedQueries(
        savedQueriesResponse?.saved_objects,
        clusterInfo,
        licenseInfo
      );

      sender.sendOnDemand(TELEMETRY_CHANNEL_SAVED_QUERIES, savedQueriesJson);

      return savedQueriesResponse.total;
    },
  };
}
