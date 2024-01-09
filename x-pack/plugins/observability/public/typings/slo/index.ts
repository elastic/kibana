/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M';

interface Duration {
  value: number;
  unit: DurationUnit;
}

type ActionGroup =
  | 'slo.burnRate.alert'
  | 'slo.burnRate.high'
  | 'slo.burnRate.medium'
  | 'slo.burnRate.low';

interface WindowSchema {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: Duration;
  shortWindow: Duration;
  actionGroup: ActionGroup;
}

interface BurnRateRuleParams extends RuleTypeParams {
  sloId: string;
  windows: WindowSchema[];
}

interface ChartData {
  key: number;
  value: number | undefined;
}

export type { ActionGroup, BurnRateRuleParams, ChartData, Duration, DurationUnit, WindowSchema };
