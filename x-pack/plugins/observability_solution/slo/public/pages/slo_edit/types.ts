/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BudgetingMethod, Indicator, TimeWindow } from '@kbn/slo-schema';

export interface CreateSLOForm<IndicatorType = Indicator> {
  name: string;
  description: string;
  indicator: IndicatorType;
  timeWindow: {
    duration: string;
    type: TimeWindow;
  };
  tags: string[];
  budgetingMethod: BudgetingMethod;
  objective: {
    target: number;
    timesliceTarget?: number;
    timesliceWindow?: string;
  };
  groupBy: string[] | string;
}
