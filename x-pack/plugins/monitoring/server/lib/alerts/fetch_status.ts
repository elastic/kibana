/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState } from '../../../common/types/alerts';
import { AlertsClient } from '../../../../alerting/server';
import { AlertsFactory } from '../../alerts';
import {
  CommonAlertStatus,
  CommonAlertState,
  CommonAlertFilter,
} from '../../../common/types/alerts';
import { ALERTS } from '../../../common/constants';

export async function fetchStatus(
  alertsClient: AlertsClient,
  alertTypes: string[] | undefined,
  filters: CommonAlertFilter[] = []
): Promise<{ [type: string]: CommonAlertStatus }> {
  const byType: { [type: string]: CommonAlertStatus } = {};
  const useTypes = alertTypes || ALERTS;
  const alertClasses = await AlertsFactory.getByTypes(useTypes, alertsClient);
  const promises = alertClasses.map(async (alert) => {
    if (!alert || !alert.rawAlert) {
      return;
    }

    const result: CommonAlertStatus = {
      states: [],
      rawAlert: alert.rawAlert,
    };

    const { alertTypeId, id } = alert.rawAlert;
    const states = await alert.getStates(alertsClient, id, filters);

    result.states = Object.values(states).reduce((accum: CommonAlertState[], instance: any) => {
      const alertInstanceState = instance.state as AlertInstanceState;
      if (!alertInstanceState.alertStates) {
        return accum;
      }
      for (const state of alertInstanceState.alertStates) {
        accum.push({ state });
      }
      return accum;
    }, []);

    const key = `${alertTypeId}:${id}`;
    byType[key] = result;
  });

  await Promise.all(promises);
  return byType;
}
