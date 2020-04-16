/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient } from 'kibana/server';
import { pick } from 'lodash';
import { Logger } from '../../../../../../src/core/server';
import { AlertsClient } from '../../../../alerting/server';
import {
  getThreshold as getGuardRailCpuUsageThreshold,
  enhanceAlertState,
} from './guard_rail_cpu_usage.lib';
import { ALERT_GUARD_RAIL_TYPE_CPU_USAGE } from '../../../common/constants';
import { AlertCpuUsageState } from '../../alerts/types';

export async function fetchAlert(
  alertsClient: AlertsClient,
  uiSettings: IUiSettingsClient,
  type: string,
  log: Logger,
  legacyConfig: any,
  legacyRequest: any,
  start: number,
  end: number
): Promise<any> {
  // We need to get the id from the alertTypeId
  const alerts = await alertsClient.find({
    options: {
      filter: `alert.attributes.alertTypeId:${type}`,
    },
  });
  if (alerts.total === 0) {
    return null;
  }
  if (alerts.total !== 1) {
    log.warn(`Found more than one alert for type ${type} which is unexpected.`);
  }

  const alert = alerts.data[0];
  const id = alert.id;
  const instances = [];

  // Now that we have the id, we can get the state
  const states = await alertsClient.getAlertState({ id });
  if (!states || !states.alertInstances) {
    log.warn(`No alert states found for type ${type} which is unexpected.`);
    return null;
  }

  const mutedInstanceIds = alert.mutedInstanceIds || [];
  for (const instanceId in states.alertInstances) {
    if (states.alertInstances.hasOwnProperty(instanceId)) {
      const instance = states.alertInstances[instanceId];

      let enhancedState = {};
      switch (type) {
        case ALERT_GUARD_RAIL_TYPE_CPU_USAGE:
          enhancedState = await enhanceAlertState(
            legacyConfig,
            legacyRequest,
            start,
            end,
            (instance.state as unknown) as AlertCpuUsageState
          );
          break;
      }

      instances.push({
        ...instance,
        instanceId,
        muted: mutedInstanceIds.includes(instanceId),
        ...enhancedState,
      });
    }
  }

  const result = {
    id,
    // Copied from the `bodySchema` in alerting/server/routes/update.ts
    raw: pick(alert, ['name', 'tags', 'schedule', 'throttle', 'params', 'actions']),
    type,
    instances,
    throttle: alert.throttle,
    threshold: 0,
  };

  switch (type) {
    case ALERT_GUARD_RAIL_TYPE_CPU_USAGE:
      result.threshold = await getGuardRailCpuUsageThreshold(uiSettings);
      break;
  }

  return result;
}
