/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertState, CommonAlertStatus } from '../../../common/types/alerts';

export function getFiringAlertCount(
  alerts: CommonAlertStatus[],
  stateFilter: (state: AlertState) => boolean
) {
  return alerts.reduce((count: number, alert) => {
    count += alert.states.filter(({ firing, state }) => firing && stateFilter(state)).length;
    return count;
  }, 0);
}
