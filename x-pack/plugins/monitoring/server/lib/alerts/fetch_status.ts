/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { AlertInstanceState } from '../../alerts/types';
import { AlertsClient } from '../../../../alerts/server';
import { AlertsFactory } from '../../alerts';
import { CommonAlertStatus, CommonAlertState, CommonAlertFilter } from '../../../common/types';
import { ALERTS } from '../../../common/constants';
import { MonitoringLicenseService } from '../../types';

export async function fetchStatus(
  alertsClient: AlertsClient,
  licenseService: MonitoringLicenseService,
  alertTypes: string[] | undefined,
  clusterUuid: string,
  start: number,
  end: number,
  filters: CommonAlertFilter[]
): Promise<{ [type: string]: CommonAlertStatus }> {
  const byType: { [type: string]: CommonAlertStatus } = {};
  await Promise.all(
    (alertTypes || ALERTS).map(async (type) => {
      const alert = await AlertsFactory.getByType(type, alertsClient);
      if (!alert || !alert.isEnabled(licenseService)) {
        return;
      }
      const serialized = alert.serialize();
      if (!serialized) {
        return;
      }

      const result: CommonAlertStatus = {
        exists: false,
        enabled: false,
        states: [],
        alert: serialized,
      };

      byType[type] = result;

      const id = alert.getId();
      if (!id) {
        return result;
      }

      result.exists = true;
      result.enabled = true;

      // Now that we have the id, we can get the state
      const states = await alert.getStates(alertsClient, id, filters);
      if (!states) {
        return result;
      }

      result.states = Object.values(states).reduce((accum: CommonAlertState[], instance: any) => {
        const alertInstanceState = instance.state as AlertInstanceState;
        for (const state of alertInstanceState.alertStates) {
          const meta = instance.meta;
          if (clusterUuid && state.cluster.clusterUuid !== clusterUuid) {
            return accum;
          }

          let firing = false;
          const isInBetween = moment(state.ui.resolvedMS).isBetween(start, end);
          if (state.ui.isFiring || isInBetween) {
            firing = true;
          }
          accum.push({ firing, state, meta });
        }
        return accum;
      }, []);
    })
  );

  return byType;
}
