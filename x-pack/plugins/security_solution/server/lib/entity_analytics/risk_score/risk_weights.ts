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
const convertCategoryToEventKindValue = (category?: string): string | undefined =>
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

export const buildCategoryScoreDeclarations = (): string => {
  return RISK_CATEGORIES.map((riskCategory) => `results['${riskCategory}_score'] = 0.0;`).join('');
};

export const buildCategoryCountDeclarations = (): string => {
  return RISK_CATEGORIES.map((riskCategory) => `results['${riskCategory}_count'] = 0;`).join('');
};

export const buildCategoryWeights = (userWeights?: RiskWeights): RiskCategoryRiskWeight[] => {
  const categoryWeights = getRiskCategoryWeights(userWeights);

  return Object.values(
    merge({}, keyBy(DEFAULT_CATEGORY_WEIGHTS, 'value'), keyBy(categoryWeights, 'value'))
  );
};

export const buildCategoryAssignment = (): string => {
  return RISK_CATEGORIES.map(
    (category) =>
      `if (inputs[i].category == '${convertCategoryToEventKindValue(
        category
      )}') { results['${category}_score'] += current_score; results['${category}_count'] += 1; }`
  ).join(' else ');
};

export const buildWeightingOfScoreByCategory = ({
  userWeights,
  identifierType,
}: {
  userWeights?: RiskWeights;
  identifierType: IdentifierType;
}): string => {
  const otherClause = `weighted_score = score;`;
  const categoryWeights = buildCategoryWeights(userWeights);

  return categoryWeights
    .map(
      (weight) =>
        `if (category == '${convertCategoryToEventKindValue(
          weight.value
        )}') { weighted_score = score * ${getWeightForIdentifierType(weight, identifierType)}; }`
    )
    .join(' else ')
    .concat(` else { ${otherClause} }`);
};
