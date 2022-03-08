/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dictionary, pickBy } from 'lodash';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

export function getRecoveredAlerts<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  alerts: Record<string, Alert<InstanceState, InstanceContext, RecoveryActionGroupId>>,
  originalAlertIds: Set<string>
): Dictionary<Alert<InstanceState, InstanceContext, RecoveryActionGroupId>> {
  return pickBy(
    alerts,
    (alert: Alert<InstanceState, InstanceContext, RecoveryActionGroupId>, id) =>
      !alert.hasScheduledActions() && originalAlertIds.has(id)
  );
}
