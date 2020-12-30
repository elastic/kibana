/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsStart, FatalErrorsSetup } from 'kibana/public';
import { UiCounterMetricType } from '@kbn/analytics';
import { createGetterSetter } from '../../../../src/plugins/kibana_utils/common';

let notifications: NotificationsStart | null = null;
let fatalErrors: FatalErrorsSetup | null = null;

export function getNotifications() {
  if (!notifications) {
    throw new Error('Rollup notifications is not defined');
  }
  return notifications;
}
export function setNotifications(newNotifications: NotificationsStart) {
  notifications = newNotifications;
}

export function getFatalErrors() {
  if (!fatalErrors) {
    throw new Error('Rollup fatalErrors is not defined');
  }
  return fatalErrors;
}
export function setFatalErrors(newFatalErrors: FatalErrorsSetup) {
  fatalErrors = newFatalErrors;
}

export const [getUiStatsReporter, setUiStatsReporter] = createGetterSetter<
  (type: UiCounterMetricType, eventNames: string | string[], count?: number) => void
>('uiMetric');

// default value if usageCollection is not available
setUiStatsReporter(() => {});

export function trackUiMetric(
  type: UiCounterMetricType,
  eventNames: string | string[],
  count?: number
) {
  getUiStatsReporter()(type, eventNames, count);
}
