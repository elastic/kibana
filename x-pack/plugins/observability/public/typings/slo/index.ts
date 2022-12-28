/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { budgetingMethodSchema, createSLOParamsSchema, GetSLOResponse } from '@kbn/slo-schema';

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M' | 'Y';

interface Duration {
  value: number;
  unit: DurationUnit;
}

type CreateSLOParamsForFE = t.OutputOf<typeof createSLOParamsSchema.props.body>;

type SLO = GetSLOResponse;

type BudgetingMethod = t.TypeOf<typeof budgetingMethodSchema>;

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

export type {
  BudgetingMethod,
  BurnRateRuleParams,
  CreateSLOParamsForFE,
  Duration,
  DurationUnit,
  SLO,
  SLOList,
};
