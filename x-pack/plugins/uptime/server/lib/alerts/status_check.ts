/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ACTION_GROUP_IDS } from '../../../../../legacy/plugins/uptime/common/constants';
import { UptimeAlertTypeFactory } from './types';
import { GetMonitorStatusResult } from '../requests';

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

const { DOWN_MONITOR } = ACTION_GROUP_IDS;

/**
 * Generates a message to include in contexts of alerts.
 * @param monitors the list of monitors to include in the message
 * @param max
 */
export const contextMessage = (monitors: GetMonitorStatusResult[], max: number): string => {
  const MIN = 2;
  if (max < MIN) throw new Error(`Maximum value must be greater than ${MIN}, received ${max}.`);

  // get unique monitor IDs
  const idSet = new Set<string>();
  for (let i = 0; i < monitors.length; i++) {
    const id = monitors[i].monitor_id;
    if (!idSet.has(id)) {
      idSet.add(id);
    }
    if (idSet.size >= max) {
      break;
    }
  }

  const uniqueIds = Array.from(idSet.keys());

  // generate the message
  let message;
  if (monitors.length) message = 'Down monitors:';
  else message = 'No down monitor IDs received';

  for (let i = 0; i < uniqueIds.length; i++) {
    if (i === max) {
      return message + `\n...and ${uniqueIds.length - i} other monitors`;
    } else {
      const id = uniqueIds[i];
      message = message + `\n${id}`;
    }
  }

  return message;
};

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
  defaultActionGroupId: DOWN_MONITOR,
  actionGroups: [
    {
      id: DOWN_MONITOR,
      name: 'Alert',
    },
  ],
  async executor(options: any) {
    const params = options.params as StatusCheckExecutorParams;

    /* This is called `monitorsByLocation` but it's really:
     * monitors by location by status. The query we run to generate this
     * filters on the status field, so effectively there should be one and only one
     * status represented in the result set. */
    const monitorsByLocation = await libs.requests.getMonitorStatus({
      callES: options.services.callCluster,
      ...params,
    });

    // if no monitors are down for our query, we don't need to trigger an alert
    if (monitorsByLocation.length) {
      const alertInstance = options.services.alertInstanceFactory(server);
      alertInstance.replaceState({
        monitors: monitorsByLocation,
      });
      alertInstance.scheduleActions(DOWN_MONITOR, {
        server,
        monitors: monitorsByLocation,
      });
    }

    return getResponse();
  },
});
