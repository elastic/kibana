/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GlobalRiskWeight,
  IdentifierType,
  RiskWeight,
  RiskWeights,
} from '../../../../common/entity_analytics/risk_engine';
import { RiskWeightTypes } from '../../../../common/entity_analytics/risk_engine';

const isGlobalIdentifierTypeWeight = (weight: RiskWeight): weight is GlobalRiskWeight =>
  weight.type === RiskWeightTypes.global;

export const getGlobalWeightForIdentifierType = ({
  identifierType,
  weights,
}: {
  identifierType: IdentifierType;
  weights?: RiskWeights;
}): number | undefined => {
  return weights?.find(isGlobalIdentifierTypeWeight)?.[identifierType];
};
