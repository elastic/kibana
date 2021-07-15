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
  clusterUuids: string[],
  filters: CommonAlertFilter[] = []
): Promise<{ [type: string]: CommonAlertStatus }> {
  const types: Array<{ type: string; result: CommonAlertStatus }> = [];
  const byType: { [type: string]: CommonAlertStatus } = {};
  await Promise.all(
    (alertTypes || ALERTS).map(async (type) => {
      const alert = await AlertsFactory.getByType(type, alertsClient);
      if (!alert || !alert.rawAlert) {
        return;
      }

      const result: CommonAlertStatus = {
        states: [],
        rawAlert: alert.rawAlert,
      };

      types.push({ type, result });

      const id = alert.getId();
      if (!id) {
        return result;
      }

      // Now that we have the id, we can get the state
      const states = await alert.getStates(alertsClient, id, filters);
      if (!states) {
        return result;
      }
      // puts all alert states associated with this rule into a flat array.  this works with both the legacy alert
      // of having multiple alert states per alert, each representing a firing node, and the current alert where each firing
      // node is an alert with a single alert state, the node itself. https://github.com/elastic/kibana/pull/102544
      result.states = Object.values(states).reduce((accum: CommonAlertState[], instance: any) => {
        const alertInstanceState = instance.state as AlertInstanceState;
        if (!alertInstanceState.alertStates) {
          return accum;
        }
        for (const state of alertInstanceState.alertStates) {
          const meta = instance.meta;
          if (clusterUuids && !clusterUuids.includes(state.cluster.clusterUuid)) {
            return accum;
          }

          let firing = false;
          if (state.ui.isFiring) {
            firing = true;
          }
          accum.push({ firing, state, meta });
        }
        return accum;
      }, []);
    })
  );

  types.sort((a, b) => (a.type === b.type ? 0 : a.type.length > b.type.length ? 1 : -1));
  for (const { type, result } of types) {
    byType[type] = result;
  }

  return byType;
}
