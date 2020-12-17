/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstanceState, AlertInstanceContext } from '../types';
import { AlertInstance } from './alert_instance';

export function createAlertInstanceFactory<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(alertInstances: Record<string, AlertInstance<State, Context>>) {
  return (id: string): AlertInstance<State, Context> => {
    if (!alertInstances[id]) {
      alertInstances[id] = new AlertInstance();
    }

    return alertInstances[id];
  };
}
