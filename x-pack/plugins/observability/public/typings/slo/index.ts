/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleTypeParams } from '@kbn/alerting-plugin/common';

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M' | 'Y';

interface Duration {
  value: number;
  unit: DurationUnit;
}

interface SLO {
  id: string;
  name: string;
  timeWindow: {
    duration: Duration;
  };
  objective: {
    target: number;
  };
  summary: {
    sliValue: number;
    errorBudget: {
      remaining: number;
    };
  };
}

interface SLOList {
  results: SLO[];
  page: number;
  perPage: number;
  total: number;
}

interface BurnRateRuleParams extends RuleTypeParams {
  sloId: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: Duration;
  shortWindow: Duration;
}

export type { BurnRateRuleParams, Duration, DurationUnit, SLO, SLOList };
