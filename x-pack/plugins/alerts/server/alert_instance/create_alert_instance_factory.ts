/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstanceContext, AlertInstanceState } from '../types';
import { AlertInstance } from './alert_instance';

export function createAlertInstanceFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext
>(alertInstances: Record<string, AlertInstance<InstanceState, InstanceContext>>) {
  return (id: string): AlertInstance<InstanceState, InstanceContext> => {
    if (!alertInstances[id]) {
      alertInstances[id] = new AlertInstance<InstanceState, InstanceContext>();
    }

    return alertInstances[id];
  };
}
