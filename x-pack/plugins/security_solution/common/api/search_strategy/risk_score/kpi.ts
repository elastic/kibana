/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { RiskQueries } from '../model/factory_query_type';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { riskScoreEntity } from './model/risk_score_entity';

export const riskScoreKpiRequestOptionsSchema = requestBasicOptionsSchema.extend({
  entity: riskScoreEntity,
  factoryQueryType: z.literal(RiskQueries.kpiRiskScore),
});

export type RiskScoreKpiRequestOptionsInput = z.input<typeof riskScoreKpiRequestOptionsSchema>;

export type RiskScoreKpiRequestOptions = z.infer<typeof riskScoreKpiRequestOptionsSchema>;
