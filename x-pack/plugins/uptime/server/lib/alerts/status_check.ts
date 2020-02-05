/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { UptimeAlertTypeFactory } from './types';

export interface StatusCheckExecutorParams {
  filters?: string;
  locations: string[];
  numTimes: number;
  timerange: {
    from: string;
    to: string;
  };
}

const getResponse = () => ({
  lastChecked: new Date(),
});

export const statusCheckAlertFactory: UptimeAlertTypeFactory = (server, libs) => ({
  id: 'xpack.uptime.alerts.downMonitor',
  name: 'X-Pack Alerting',
  validate: {
    params: schema.object({
      filters: schema.maybe(schema.string()),
      numTimes: schema.number(),
      timerange: schema.object({
        from: schema.string(),
        to: schema.string(),
      }),
      locations: schema.arrayOf(schema.string()),
    }),
  },
  actionGroups: ['uptime.downMonitor'],
  async executor(options) {
    const params = options.params as StatusCheckExecutorParams;

    const monitors = await libs.requests.getMonitorStatus({
      callES: options.services.callCluster,
      ...params,
    });

    if (monitors.length) {
      // @ts-ignore TODO: fix this
      const alertInstance = options.services.alertInstanceFactory(server);
      alertInstance.replaceState({
        monitors,
      });
      alertInstance.scheduleActions('uptime.downMonitor', {
        server,
        monitors,
      });
    }

    return getResponse();
  },
});
