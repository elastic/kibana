/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, merge } from 'lodash';

import type { IdentifierType, RiskScoreWeight } from './types';

export enum RiskWeightTypes {
  global = 'global_identifier',
  riskCategory = 'risk_category',
}

export enum RiskCategories {
  alerts = 'alerts',
}
const RISK_CATEGORIES = Object.values(RiskCategories);

const DEFAULT_CATEGORY_WEIGHTS: RiskScoreWeight[] = RISK_CATEGORIES.map((category) => ({
  type: RiskWeightTypes.riskCategory,
  value: category,
  host: 1,
  user: 1,
}));

/*
 * This function and its use can be deleted once we've replaced our use of event.kind with a proper risk category field.
 */
const convertCategoryToEventKindValue = (category?: string): string | undefined =>
  category === 'alerts' ? 'signal' : category;

const isGlobalIdentifierTypeWeight = (weight: RiskScoreWeight): boolean =>
  weight.type === RiskWeightTypes.global;
const isRiskCategoryWeight = (weight: RiskScoreWeight): boolean =>
  weight.type === RiskWeightTypes.riskCategory;

export const getGlobalWeightForIdentifierType = ({
  identifierType,
  weights,
}: {
  identifierType: IdentifierType;
  weights?: RiskScoreWeight[];
}): number | undefined => {
  return weights?.find((weight) => isGlobalIdentifierTypeWeight(weight))?.[identifierType];
};

const riskCategoryWeights = (weights?: RiskScoreWeight[]): RiskScoreWeight[] | undefined =>
  weights?.filter((weight) => isRiskCategoryWeight(weight));

const getWeightForIdentifierType = (
  weight: RiskScoreWeight,
  identifierType: IdentifierType
): number => {
  const configuredWeight = weight[identifierType];
  return typeof configuredWeight === 'number' ? configuredWeight : 1;
};

export const buildCategoryScoreDeclarations = (): string => {
  const otherScoreDeclaration = `results['other_score'] = 0;`;

  return RISK_CATEGORIES.map((riskCategory) => `results['${riskCategory}_score'] = 0;`)
    .join('')
    .concat(otherScoreDeclaration);
};

export const buildCategoryWeights = (userWeights?: RiskScoreWeight[]): RiskScoreWeight[] => {
  const categoryWeights = riskCategoryWeights(userWeights);

  return Object.values(
    merge({}, keyBy(DEFAULT_CATEGORY_WEIGHTS, 'value'), keyBy(categoryWeights, 'value'))
  );
};

export const buildCategoryScoreAssignment = (): string => {
  const otherClause = `results['other_score'] += current_score;`;

  return RISK_CATEGORIES.map(
    (category) =>
      `if (inputs[i].category == '${convertCategoryToEventKindValue(
        category
      )}') { results['${category}_score'] += current_score; }`
  )
    .join(' else ')
    .concat(` else { ${otherClause} }`);
};

export const buildWeightingOfScoreByCategory = ({
  userWeights,
  identifierType,
}: {
  userWeights?: RiskScoreWeight[];
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
