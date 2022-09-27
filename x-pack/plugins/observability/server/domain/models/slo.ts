/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { InvalidParameter } from '../../errors';
import { BudgetingMethod } from './budgeting_method';
import { Indicator } from './indicators';
import { Objective } from './objective';
import { TimeWindow } from './time_window';

export class SLO {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public indicator: Indicator,
    public time_window: TimeWindow,
    public budgeting_method: BudgetingMethod,
    public objective: Objective,
    public created_at: Date,
    public updated_at: Date
  ) {
    if (objective.target > 1 || objective.target <= 0) {
      throw new InvalidParameter('Invalid objective target');
    }
  }

  static create(
    name: string,
    description: string,
    indicator: Indicator,
    timeWindow: TimeWindow,
    budgetingMethod: BudgetingMethod,
    objective: Objective
  ): SLO {
    const now = new Date();
    return new SLO(
      uuid.v1(),
      name,
      description,
      indicator,
      timeWindow,
      budgetingMethod,
      objective,
      now,
      now
    );
  }
}
