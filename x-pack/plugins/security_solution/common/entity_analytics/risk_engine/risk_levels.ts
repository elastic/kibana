/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityRiskLevels } from '../../api/entity_analytics/common';

export const RISK_LEVEL_RANGES = {
  [EntityRiskLevels.enum.Unknown]: { start: 0, stop: 20 },
  [EntityRiskLevels.enum.Low]: { start: 20, stop: 40 },
  [EntityRiskLevels.enum.Moderate]: { start: 40, stop: 70 },
  [EntityRiskLevels.enum.High]: { start: 70, stop: 90 },
  [EntityRiskLevels.enum.Critical]: { start: 90, stop: 100 },
};

export const getRiskLevel = (riskScore: number): EntityRiskLevels => {
  if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevels.enum.Critical].start) {
    return EntityRiskLevels.enum.Critical;
  } else if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevels.enum.High].start) {
    return EntityRiskLevels.enum.High;
  } else if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevels.enum.Moderate].start) {
    return EntityRiskLevels.enum.Moderate;
  } else if (riskScore >= RISK_LEVEL_RANGES[EntityRiskLevels.enum.Low].start) {
    return EntityRiskLevels.enum.Low;
  } else {
    return EntityRiskLevels.enum.Unknown;
  }
};
