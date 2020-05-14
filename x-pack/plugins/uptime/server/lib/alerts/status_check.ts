/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isRight } from 'fp-ts/lib/Either';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { i18n } from '@kbn/i18n';
import { AlertExecutorOptions } from '../../../../alerting/server';
import { UptimeAlertTypeFactory } from './types';
import { GetMonitorStatusResult } from '../requests';
import { StatusCheckExecutorParamsType } from '../../../common/runtime_types';
import { ACTION_GROUP_DEFINITIONS } from '../../../common/constants';
import { savedObjectsAdapter } from '../saved_objects';
import { updateState } from './common';
import { commonStateTranslations } from './translations';

const { MONITOR_STATUS } = ACTION_GROUP_DEFINITIONS;

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
 * @param max the maximum number of items the summary should contain
 */
export const contextMessage = (monitorIds: string[], max: number): string => {
  const MIN = 2;
  if (max < MIN) throw new Error(`Maximum value must be greater than ${MIN}, received ${max}.`);

  // generate the message
  let message;
  if (monitorIds.length === 1) {
    message = i18n.translate('xpack.uptime.alerts.message.singularTitle', {
      defaultMessage: 'Down monitor: ',
    });
  } else if (monitorIds.length) {
    message = i18n.translate('xpack.uptime.alerts.message.multipleTitle', {
      defaultMessage: 'Down monitors: ',
    });
  }
  // this shouldn't happen because the function should only be called
  // when > 0 monitors are down
  else {
    message = i18n.translate('xpack.uptime.alerts.message.emptyTitle', {
      defaultMessage: 'No down monitor IDs received',
    });
  }

  for (let i = 0; i < monitorIds.length; i++) {
    const id = monitorIds[i];
    if (i === max) {
      return (
        message +
        i18n.translate('xpack.uptime.alerts.message.overflowBody', {
          defaultMessage: `... and {overflowCount} other monitors`,
          values: {
            overflowCount: monitorIds.length - i,
          },
        })
      );
    } else if (i === 0) {
      message = message + id;
    } else {
      message = message + `, ${id}`;
    }
  }

  return message;
};

/**
 * Creates an exhaustive list of all the down monitors.
 * @param list all the monitors that are down
 * @param sizeLimit the max monitors, we shouldn't allow an arbitrarily long string
 */
export const fullListByIdAndLocation = (
  list: GetMonitorStatusResult[],
  sizeLimit: number = 1000
) => {
  return (
    list
      // sort by id, then location
      .sort((a, b) => {
        if (a.monitor_id > b.monitor_id) {
          return 1;
        } else if (a.monitor_id < b.monitor_id) {
          return -1;
        } else if (a.location > b.location) {
          return 1;
        }
        return -1;
      })
      .slice(0, sizeLimit)
      .reduce(
        (cur, { monitor_id: id, location }) =>
          cur + `${id} from ${location ?? 'Unnamed location'}; `,
        ''
      ) +
    (sizeLimit < list.length
      ? i18n.translate('xpack.uptime.alerts.message.fullListOverflow', {
          defaultMessage: '...and {overflowCount} other {pluralizedMonitor}',
          values: {
            pluralizedMonitor:
              list.length - sizeLimit === 1 ? 'monitor/location' : 'monitors/locations',
            overflowCount: list.length - sizeLimit,
          },
        })
      : '')
  );
};

// Right now the maximum number of monitors shown in the message is hardcoded here.
// we might want to make this a parameter in the future
const DEFAULT_MAX_MESSAGE_ROWS = 3;

export const statusCheckAlertFactory: UptimeAlertTypeFactory = (_server, libs) => ({
  id: 'xpack.uptime.alerts.monitorStatus',
  name: i18n.translate('xpack.uptime.alerts.monitorStatus', {
    defaultMessage: 'Uptime monitor status',
  }),
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
  defaultActionGroupId: MONITOR_STATUS.id,
  actionGroups: [
    {
      id: MONITOR_STATUS.id,
      name: MONITOR_STATUS.name,
    },
  ],
  actionVariables: {
    context: [
      {
        name: 'message',
        description: i18n.translate(
          'xpack.uptime.alerts.monitorStatus.actionVariables.context.message.description',
          {
            defaultMessage: 'A generated message summarizing the currently down monitors',
          }
        ),
      },
      {
        name: 'downMonitorsWithGeo',
        description: i18n.translate(
          'xpack.uptime.alerts.monitorStatus.actionVariables.context.downMonitorsWithGeo.description',
          {
            defaultMessage:
              'A generated summary that shows some or all of the monitors detected as "down" by the alert',
          }
        ),
      },
    ],
    state: [...commonStateTranslations],
  },
  producer: 'uptime',
  async executor(options: AlertExecutorOptions) {
    const { params: rawParams } = options;
    const decoded = StatusCheckExecutorParamsType.decode(rawParams);
    if (!isRight(decoded)) {
      ThrowReporter.report(decoded);
      return {
        error: 'Alert param types do not conform to required shape.',
      };
    }

    const params = decoded.right;
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(
      options.services.savedObjectsClient
    );
    /* This is called `monitorsByLocation` but it's really
     * monitors by location by status. The query we run to generate this
     * filters on the status field, so effectively there should be one and only one
     * status represented in the result set. */
    const monitorsByLocation = await libs.requests.getMonitorStatus({
      callES: options.services.callCluster,
      dynamicSettings,
      ...params,
    });

    // if no monitors are down for our query, we don't need to trigger an alert
    if (monitorsByLocation.length) {
      const uniqueIds = uniqueMonitorIds(monitorsByLocation);
      const alertInstance = options.services.alertInstanceFactory(MONITOR_STATUS.id);
      alertInstance.replaceState({
        ...options.state,
        monitors: monitorsByLocation,
        ...updateState(options.state, true),
      });
      alertInstance.scheduleActions(MONITOR_STATUS.id, {
        message: contextMessage(Array.from(uniqueIds.keys()), DEFAULT_MAX_MESSAGE_ROWS),
        downMonitorsWithGeo: fullListByIdAndLocation(monitorsByLocation),
      });
    }

    return updateState(options.state, monitorsByLocation.length > 0);
  },
});
