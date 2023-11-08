/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { RiskQueries } from '../model/factory_query_type';
import { requestBasicOptionsSchema } from '../model/request_basic_options';
import { sort } from '../model/sort';
import { timerange } from '../model/timerange';
import { riskScoreEntity } from './model/risk_score_entity';

export enum RiskScoreFields {
  timestamp = '@timestamp',
  hostName = 'host.name',
  hostRiskScore = 'host.risk.calculated_score_norm',
  hostRisk = 'host.risk.calculated_level',
  userName = 'user.name',
  userRiskScore = 'user.risk.calculated_score_norm',
  userRisk = 'user.risk.calculated_level',
  alertsCount = 'alertsCount',
}

const baseRiskScoreRequestOptionsSchema = requestBasicOptionsSchema.extend({
  alertsTimerange: timerange.optional(),
  riskScoreEntity,
  includeAlertsCount: z.boolean().optional(),
  onlyLatest: z.boolean().optional(),
  pagination: z
    .object({
      cursorStart: z.number(),
      querySize: z.number(),
    })
    .optional(),
  sort: sort
    .removeDefault()
    .extend({
      field: z.enum([
        RiskScoreFields.timestamp,
        RiskScoreFields.hostName,
        RiskScoreFields.hostRiskScore,
        RiskScoreFields.hostRisk,
        RiskScoreFields.userName,
        RiskScoreFields.userRiskScore,
        RiskScoreFields.userRisk,
        RiskScoreFields.alertsCount,
      ]),
    })
    .optional(),
});

export const hostsRiskScoreRequestOptionsSchema = baseRiskScoreRequestOptionsSchema.extend({
  factoryQueryType: z.literal(RiskQueries.hostsRiskScore),
});

export const usersRiskScoreRequestOptionsSchema = baseRiskScoreRequestOptionsSchema.extend({
  factoryQueryType: z.literal(RiskQueries.usersRiskScore),
});

export const riskScoreRequestOptionsSchema = z.union([
  hostsRiskScoreRequestOptionsSchema,
  usersRiskScoreRequestOptionsSchema,
]);

export type RiskScoreRequestOptionsInput = z.input<typeof riskScoreRequestOptionsSchema>;

export type RiskScoreRequestOptions = z.infer<typeof riskScoreRequestOptionsSchema>;
