/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UserRiskScore,
  HostRiskScore,
} from '../../../common/search_strategy/security_solution/risk_score/all';

const ALERTS_SIZE = 1000;

/**
 * return query to fetch alerts related to the risk score
 */
export const getAlertsQueryForRiskScore = (riskScore: UserRiskScore | HostRiskScore) => {
  return {
    fields: ['*'],
    size: ALERTS_SIZE,
    _source: false,
    query: {
      terms: {},
    },
  };
};
