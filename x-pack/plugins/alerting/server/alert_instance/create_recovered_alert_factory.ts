/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '../types';
import { RecoveredAlert } from './recovered_alert';

export function createRecoveredAlertFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(recoveredAlerts: Record<string, RecoveredAlert<InstanceState, InstanceContext>>) {
  return (id: string): RecoveredAlert<InstanceState, InstanceContext> => {
    if (!recoveredAlerts[id]) {
      recoveredAlerts[id] = new RecoveredAlert<InstanceState, InstanceContext>();
    }

    return recoveredAlerts[id];
  };
}
