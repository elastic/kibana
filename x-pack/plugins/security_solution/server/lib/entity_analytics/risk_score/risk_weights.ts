/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, merge } from 'lodash';
import type {
  GlobalRiskWeight,
  IdentifierType,
  RiskCategoryRiskWeight,
  RiskWeight,
  RiskWeights,
} from '../../../../common/entity_analytics/risk_engine';
import { RiskCategories, RiskWeightTypes } from '../../../../common/entity_analytics/risk_engine';

const RISK_CATEGORIES = Object.values(RiskCategories);

const DEFAULT_CATEGORY_WEIGHTS: RiskWeights = RISK_CATEGORIES.map((category) => ({
  type: RiskWeightTypes.riskCategory,
  value: category,
  host: 1,
  user: 1,
}));

/*
 * This function and its use can be deleted once we've replaced our use of event.kind with a proper risk category field.
 */
export const convertCategoryToEventKindValue = (category?: string): string | undefined =>
  category === 'category_1' ? 'signal' : category;

const isGlobalIdentifierTypeWeight = (weight: RiskWeight): weight is GlobalRiskWeight =>
  weight.type === RiskWeightTypes.global;
const isRiskCategoryWeight = (weight: RiskWeight): weight is RiskCategoryRiskWeight =>
  weight.type === RiskWeightTypes.riskCategory;

export const getGlobalWeightForIdentifierType = ({
  identifierType,
  weights,
}: {
  identifierType: IdentifierType;
  weights?: RiskWeights;
}): number | undefined => {
  return weights?.find(isGlobalIdentifierTypeWeight)?.[identifierType];
};

const getRiskCategoryWeights = (weights?: RiskWeights): RiskCategoryRiskWeight[] =>
  weights?.filter(isRiskCategoryWeight) ?? [];

const getWeightForIdentifierType = (weight: RiskWeight, identifierType: IdentifierType): number => {
  const configuredWeight = weight[identifierType];
  return typeof configuredWeight === 'number' ? configuredWeight : 1;
};

export const buildCategoryWeights = (userWeights?: RiskWeights): RiskCategoryRiskWeight[] => {
  const categoryWeights = getRiskCategoryWeights(userWeights);

  return Object.values(
    merge({}, keyBy(DEFAULT_CATEGORY_WEIGHTS, 'value'), keyBy(categoryWeights, 'value'))
  );
};

export const calculateWeightedScore = ({
  category,
  score,
  userWeights,
  identifierType,
}: {
  category?: string;
  score: number;
  userWeights?: RiskWeights;
  identifierType: IdentifierType;
}): number => {
  const categoryWeights = buildCategoryWeights(userWeights);

  const categoryWeight = categoryWeights.find((weight) => weight.value === category);

  if (categoryWeight) {
    return score * getWeightForIdentifierType(categoryWeight, identifierType);
  }

  return score;
};
