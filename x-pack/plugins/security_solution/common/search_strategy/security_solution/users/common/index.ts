/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Maybe, RiskSeverity } from '../../..';

export const enum UserRiskScoreFields {
  timestamp = '@timestamp',
  userName = 'user.name',
  riskScore = 'risk_stats.risk_score',
  risk = 'risk',
}

export interface UserRiskScoreItem {
  _id?: Maybe<string>;
  [UserRiskScoreFields.userName]: Maybe<string>;
  [UserRiskScoreFields.risk]: Maybe<RiskSeverity>;
  [UserRiskScoreFields.riskScore]: Maybe<number>;
}
