/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { TELEMETRY_CHANNEL_PACKS } from '../constants';
import { templatePacks } from '../helpers';
import { TelemetryEventsSender } from '../sender';
import { TelemetryReceiver } from '../receiver';
import type { ESClusterInfo, ESLicense } from '../types';

export function createTelemetryPacksTaskConfig() {
  return {
    type: 'osquery:telemetry-packs',
    title: 'Osquery Packs Telemetry',
    interval: '24h',
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

      const packsResponse = await receiver.fetchPacks();

      if (!packsResponse?.total) {
        logger.debug('no packs found');
        return 0;
      }

      const packsJson = templatePacks(packsResponse?.saved_objects, clusterInfo, licenseInfo);

      sender.sendOnDemand(TELEMETRY_CHANNEL_PACKS, packsJson);

      return packsResponse.total;
    },
  };
}
