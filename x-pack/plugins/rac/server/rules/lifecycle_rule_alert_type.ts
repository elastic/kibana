/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AlertType, AlertExecutorOptions } from '../../../alerting/server';
import {
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../../../alerting/common';
import { LIFECYCLE_RULE_ALERT_TYPE_ID } from '../../public/types';

interface LifecycleRuleAlertTypeParams extends AlertTypeParams {
  server: string;
  threshold: number;
}

interface LifecycleRuleAlertTypeState extends AlertTypeState {
  lastChecked: Date;
}

interface LifecycleRuleAlertTypeInstanceState extends AlertInstanceState {
  cpuUsage: number;
}

interface LifecycleRuleAlertTypeInstanceContext extends AlertInstanceContext {
  server: string;
  hasCpuUsageIncreased: boolean;
}

type LifecycleRuleAlertTypeActionGroups = 'default' | 'warning';

export const lifecycleRuleAlertType: AlertType<
  LifecycleRuleAlertTypeParams,
  LifecycleRuleAlertTypeState,
  LifecycleRuleAlertTypeInstanceState,
  LifecycleRuleAlertTypeInstanceContext,
  LifecycleRuleAlertTypeActionGroups
> = {
  id: LIFECYCLE_RULE_ALERT_TYPE_ID,
  name: 'LifecycleRule alert type',
  validate: {
    params: schema.object({
      server: schema.string(),
      threshold: schema.number({ min: 0, max: 1 }),
    }),
  },
  actionGroups: [
    {
      id: 'default',
      name: 'Default',
    },
    {
      id: 'warning',
      name: 'Warning',
    },
  ],
  defaultActionGroupId: 'default',
  actionVariables: {
    context: [
      { name: 'server', description: 'the server' },
      {
        name: 'hasCpuUsageIncreased',
        description: 'boolean indicating if the cpu usage has increased',
      },
    ],
    state: [{ name: 'cpuUsage', description: 'CPU usage' }],
  },
  minimumLicenseRequired: 'basic',
  producer: 'rac',
  async executor({
    alertId,
    startedAt,
    previousStartedAt,
    services,
    params,
    state,
  }: AlertExecutorOptions<
    LifecycleRuleAlertTypeParams,
    LifecycleRuleAlertTypeState,
    LifecycleRuleAlertTypeInstanceState,
    LifecycleRuleAlertTypeInstanceContext,
    LifecycleRuleAlertTypeActionGroups
  >) {
    // Let's assume params is { server: 'server_1', threshold: 0.8 }
    const { server, threshold } = params;

    // Call a function to get the server's current CPU usage
    const currentCpuUsage: number = 0.9;

    // Only execute if CPU usage is greater than threshold
    if (currentCpuUsage > threshold) {
      // The first argument is a unique identifier the alert instance is about. In this scenario
      // the provided server will be used. Also, this id will be used to make `getState()` return
      // previous state, if any, on matching identifiers.
      const alertInstance = services.alertInstanceFactory(server);

      // State from last execution. This will exist if an alert instance was created and executed
      // in the previous execution
      const { cpuUsage: previousCpuUsage } = alertInstance.getState();

      // Replace state entirely with new values
      alertInstance.replaceState({
        cpuUsage: currentCpuUsage,
      });

      // 'default' refers to the id of a group of actions to be scheduled for execution, see 'actions' in create alert section
      alertInstance.scheduleActions('default', {
        server,
        hasCpuUsageIncreased: currentCpuUsage > previousCpuUsage,
      });
    }

    // Returning updated alert type level state, this will become available
    // within the `state` function parameter at the next execution
    return {
      // This is an example attribute you could set, it makes more sense to use this state when
      // the alert type executes multiple instances but wants a single place to track certain values.
      lastChecked: new Date(),
    };
  },
};
