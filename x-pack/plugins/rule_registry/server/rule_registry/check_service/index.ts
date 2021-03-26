/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionVariable } from '../../../../alerting/common';
import { AlertExecutorOptions } from '../../../../alerting/server';
import { AlertSeverityLevel } from '../../../common';
import { AlertCheck } from '../../types';
import { DefaultFieldMap } from '../defaults/field_map';

type AlertInstanceFactory = AlertExecutorOptions<
  never,
  never,
  never,
  never,
  string
>['services']['alertInstanceFactory'];

export function createCheckService({
  levels,
  alertInstanceFactory,
}: {
  levels: Array<{ level: AlertSeverityLevel; actionGroupId: string }>;
  alertInstanceFactory: AlertInstanceFactory;
}) {
  const alerts: Record<
    string,
    { level: AlertSeverityLevel } & AlertCheck<DefaultFieldMap, ActionVariable>
  > = {};

  const getCheckFunction = (level: { level: AlertSeverityLevel; actionGroupId: string }) => {
    return (alert: AlertCheck<DefaultFieldMap, ActionVariable>) => {
      const instance = alertInstanceFactory(alert.name);
      instance.scheduleActions(level.actionGroupId);
      alerts[alert.name] = {
        level: level.level,
        ...alert,
      };
    };
  };

  return {
    check: Object.fromEntries(
      levels.map((level) => [level.level, getCheckFunction(level)])
    ) as Record<AlertSeverityLevel, ReturnType<typeof getCheckFunction>>,
    getAlerts: () => alerts,
  };
}
