/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskLevels } from './types';

export const RISK_LEVEL_RANGES = {
  [RiskLevels.unknown]: { start: 0, stop: 20 },
  [RiskLevels.low]: { start: 20, stop: 40 },
  [RiskLevels.moderate]: { start: 40, stop: 70 },
  [RiskLevels.high]: { start: 70, stop: 90 },
  [RiskLevels.critical]: { start: 90, stop: 100 },
};

export const getRiskLevel = (riskScore: number): RiskLevels => {
  if (riskScore >= RISK_LEVEL_RANGES[RiskLevels.critical].start) {
    return RiskLevels.critical;
  } else if (riskScore >= RISK_LEVEL_RANGES[RiskLevels.high].start) {
    return RiskLevels.high;
  } else if (riskScore >= RISK_LEVEL_RANGES[RiskLevels.moderate].start) {
    return RiskLevels.moderate;
  } else if (riskScore >= RISK_LEVEL_RANGES[RiskLevels.low].start) {
    return RiskLevels.low;
  } else {
    return RiskLevels.unknown;
  }
};
