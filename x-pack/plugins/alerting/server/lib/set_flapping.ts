/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_FLAPPING, ALERT_FLAPPING_HISTORY } from '@kbn/rule-data-utils';
import { keys } from 'lodash';
import { type Alert } from '../../common';
import { isFlapping } from './flapping_utils';

export function setFlapping(
  activeAlerts: Record<string, Alert> = {},
  recoveredAlerts: Record<string, Alert> = {}
) {
  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    const flapping = isAlertFlapping(alert);
    alert[ALERT_FLAPPING] = flapping;
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const flapping = isAlertFlapping(alert);
    alert[ALERT_FLAPPING] = flapping;
  }
}

export function isAlertFlapping(alert: Alert): boolean {
  const flappingHistory: boolean[] = alert[ALERT_FLAPPING_HISTORY] ?? [];
  const isCurrentlyFlapping = alert[ALERT_FLAPPING] ?? false;
  return isFlapping(flappingHistory, isCurrentlyFlapping);
}
