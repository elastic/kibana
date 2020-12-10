/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommonAlertState, CommonAlertStatus } from '../../../common/types/alerts';

export function filterAlertStates(
  alerts: { [alertTypeId: string]: CommonAlertStatus },
  filter: (alertState: CommonAlertState) => boolean
) {
  return Object.keys(alerts).reduce((accum, alertTypeId) => {
    const alertStatus = alerts[alertTypeId];
    return {
      ...accum,
      [alertTypeId]: {
        ...alertStatus,
        states: alertStatus.states.filter(filter),
      },
    };
  }, []);
}
