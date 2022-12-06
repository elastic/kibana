/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TELEMETRY_EBT_CONFIG_EVENT } from '../constants';
import { templateConfigs } from '../helpers';
import type { TelemetryEventsSender } from '../sender';
import type { TelemetryReceiver } from '../receiver';

export function createTelemetryConfigsTaskConfig() {
  return {
    type: 'osquery:telemetry-configs',
    title: 'Osquery Configs Telemetry',
    interval: '24h',
    timeout: '10m',
    version: '1.1.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: TelemetryReceiver,
      sender: TelemetryEventsSender
    ) => {
      const configsResponse = await receiver.fetchConfigs();

      if (!configsResponse?.total) {
        logger.debug('no configs found');

        return;
      }

      const configsJson = templateConfigs(configsResponse?.items);

      configsJson.forEach((config) => {
        sender.reportEvent(TELEMETRY_EBT_CONFIG_EVENT, config);
      });
    },
  };
}
