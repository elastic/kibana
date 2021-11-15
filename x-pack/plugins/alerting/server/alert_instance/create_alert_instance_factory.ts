/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '../types';
import { AlertInstance } from './alert_instance';

export function createAlertInstanceFactory<
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string
>(alertInstances: Record<string, AlertInstance<InstanceState, InstanceContext, ActionGroupIds>>) {
  return (
    id: string,
    staticContext: Record<string, unknown>
  ): AlertInstance<InstanceState, InstanceContext, ActionGroupIds> => {
    if (!alertInstances[id]) {
      alertInstances[id] = new AlertInstance<InstanceState, InstanceContext, ActionGroupIds>();
      alertInstances[id].setStaticContext(staticContext ?? {});
    } else {
      // Merge existing static context with any new contexts
      const currentStaticContext = alertInstances[id].getStaticContext();
      alertInstances[id].setStaticContext({ ...currentStaticContext, ...staticContext });
    }

    return alertInstances[id];
  };
}
