/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BudgetingMethod, Indicator, TimeWindow } from '@kbn/slo-schema';

export type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M' | 'Y';

export interface Duration {
  value: number;
  unit: DurationUnit;
}

export interface CreateSLOForm {
  name: string;
  description: string;
  indicator: Indicator;
  timeWindow: {
    duration: Duration;
    type: TimeWindow;
  };
  tags: string[];
  budgetingMethod: BudgetingMethod;
  objective: {
    target: number;
    timesliceTarget?: number;
    timesliceWindow?: Duration;
  };
}
