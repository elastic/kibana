/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { AlertAction } from '../../../../alerting/common';
import { Logger } from '../../../../../../src/core/server';
// import { AlertState } from '../../alerts/types';
import { AlertsClient } from '../../../../alerting/server';

interface Alert {
  type: string;
  exists: boolean;
  enabled: boolean;
  actions: AlertAction[];
  states: AlertState[];
}

interface AlertState {
  firing: boolean;
  state: any;
}

export async function fetchStatus(
  alertsClient: AlertsClient,
  alertTypes: string[],
  start: number,
  end: number,
  log: Logger
): Promise<any[]> {
  const statuses = await Promise.all(
    alertTypes.map(async type => {
      const result: Alert = {
        type,
        exists: false,
        enabled: false,
        actions: [],
        states: [],
      };

      // We need to get the id from the alertTypeId
      const alerts = await alertsClient.find({
        options: {
          filter: `alert.attributes.alertTypeId:${type}`,
        },
      });
      if (alerts.total === 0) {
        return result;
      }

      if (alerts.total !== 1) {
        log.warn(`Found more than one alert for type ${type} which is unexpected.`);
      }

      result.enabled = true;

      const { id, actions } = alerts.data[0];

      result.actions = actions;

      // Now that we have the id, we can get the state
      const states = await alertsClient.getAlertState({ id });
      if (!states || !states.alertInstances) {
        result.enabled = true;
        return result;
      }

      result.states = Object.values(states.alertInstances).map((instance: any) => {
        const state = instance.state;
        const isInBetween = moment(state.ui.resolvedMS).isBetween(start, end);
        if (state.ui.isFiring || isInBetween) {
          return {
            firing: true,
            state,
          };
        }
        return { firing: false, state };
      });

      return result;
    })
  );

  return statuses;
}
