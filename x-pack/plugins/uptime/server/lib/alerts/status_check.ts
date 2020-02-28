/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ACTION_GROUP_DEFINITIONS } from '../../../../../legacy/plugins/uptime/common/constants';
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

const { DOWN_MONITOR } = ACTION_GROUP_DEFINITIONS;

/**
 * Reduce a composite-key array of status results to a set of unique IDs.
 * @param items to reduce
 */
export const uniqueMonitorIds = (items: GetMonitorStatusResult[]): Set<string> =>
  items.reduce((acc, { monitor_id }) => {
    acc.add(monitor_id);
    return acc;
  }, new Set<string>());

/**
 * Generates a message to include in contexts of alerts.
 * @param monitors the list of monitors to include in the message
 * @param max
 */
export const contextMessage = (monitorIds: string[], max: number): string => {
  const MIN = 2;
  if (max < MIN) throw new Error(`Maximum value must be greater than ${MIN}, received ${max}.`);

  // generate the message
  let message;
  if (monitorIds.length === 1) message = 'Down monitor:';
  else if (monitorIds.length) message = 'Down monitors:';
  // this shouldn't happen because the function should only be called
  // when > 0 monitors are down
  else message = 'No down monitor IDs received';

  for (let i = 0; i < monitorIds.length; i++) {
    if (i === max) {
      return message + `\n...and ${monitorIds.length - i} other monitors`;
    } else {
      const id = monitorIds[i];
      message = message + `\n${id}`;
    }
  }

  return message;
};

// Right now the maximum number of monitors shown in the message is hardcoded here.
// we will probably want to make this a parameter in the future
const DEFAULT_MAX_MESSAGE_ROWS = 3;

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
      id: DOWN_MONITOR.id,
      name: DOWN_MONITOR.name,
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
      const uniqueIds = uniqueMonitorIds(monitorsByLocation);
      const alertInstance = options.services.alertInstanceFactory(server);
      alertInstance.replaceState({
        monitors: monitorsByLocation,
      });
      alertInstance.scheduleActions(DOWN_MONITOR, {
        message: contextMessage(Array.from(uniqueIds.keys()), DEFAULT_MAX_MESSAGE_ROWS),
        server,
        monitors: monitorsByLocation,
      });
    }

    // this stateful data is at the cluster level, not an alert instance level,
    // so any alert of this type will flush/overwrite the state when they return
    return {};
  },
});
