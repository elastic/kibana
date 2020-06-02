/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { Logger } from '../../../../../../src/core/server';
import { AlertCommonPerClusterState } from '../../alerts/types';
import { AlertsClient } from '../../../../alerts/server';

export async function fetchStatus(
  alertsClient: AlertsClient,
  alertTypes: string[],
  start: number,
  end: number,
  log: Logger
): Promise<any[]> {
  const statuses = await Promise.all(
    alertTypes.map(
      (type) =>
        new Promise(async (resolve, reject) => {
          // We need to get the id from the alertTypeId
          const alerts = await alertsClient.find({
            options: {
              filter: `alert.attributes.alertTypeId:${type}`,
            },
          });
          if (alerts.total === 0) {
            return resolve(false);
          }

          if (alerts.total !== 1) {
            log.warn(`Found more than one alert for type ${type} which is unexpected.`);
          }

          const id = alerts.data[0].id;

          // Now that we have the id, we can get the state
          const states = await alertsClient.getAlertState({ id });
          if (!states || !states.alertTypeState) {
            log.warn(`No alert states found for type ${type} which is unexpected.`);
            return resolve(false);
          }

          const state = Object.values(states.alertTypeState)[0] as AlertCommonPerClusterState;
          const isInBetween = moment(state.ui.resolvedMS).isBetween(start, end);
          if (state.ui.isFiring || isInBetween) {
            return resolve({
              type,
              ...state.ui,
            });
          }
          return resolve(false);
        })
    )
  );

  return statuses.filter(Boolean);
}
