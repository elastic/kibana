/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreState } from '../../../../entity_analytics/api/hooks/use_risk_score';
import type { RiskScoreEntity, UserRiskScore } from '../../../../../common/search_strategy';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskCategories } from '../../../../../common/entity_analytics/risk_engine';

const userRiskScore: UserRiskScore = {
  '@timestamp': '626569200000',
  user: {
    name: 'test',
    risk: {
      rule_risks: [],
      calculated_score_norm: 70,
      multipliers: [],
      calculated_level: RiskSeverity.high,
      inputs: [
        {
          id: '_id',
          index: '_index',
          category: RiskCategories.category_1,
          description: 'Alert from Rule: My rule',
          risk_score: 30,
          timestamp: '2021-08-19T18:55:59.000Z',
        },
      ],
    },
  },
  alertsCount: 0,
  oldestAlertTimestamp: '626569200000',
};

export const mockRiskScoreState: RiskScoreState<RiskScoreEntity.user> = {
  data: [userRiskScore],
  inspect: {
    dsl: [],
    response: [],
  },
  isInspected: false,
  refetch: () => {},
  totalCount: 0,
  isModuleEnabled: true,
  isAuthorized: true,
  isDeprecated: false,
  loading: false,
};
