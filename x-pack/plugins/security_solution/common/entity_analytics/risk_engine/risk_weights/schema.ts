/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NumberBetweenZeroAndOneInclusive } from '@kbn/securitysolution-io-ts-types';

import { fromEnum } from '../utils';
import { RiskCategories, RiskWeightTypes } from './types';

const hostWeight = t.type({
  host: NumberBetweenZeroAndOneInclusive,
});

const userWeight = t.type({
  user: NumberBetweenZeroAndOneInclusive,
});

const identifierWeights = t.union([
  t.exact(t.intersection([hostWeight, userWeight])),
  t.exact(t.intersection([hostWeight, t.partial({ user: t.undefined })])),
  t.exact(t.intersection([userWeight, t.partial({ host: t.undefined })])),
]);

const riskCategories = fromEnum('riskCategories', RiskCategories);

const globalRiskWeightSchema = t.intersection([
  t.exact(
    t.type({
      type: t.literal(RiskWeightTypes.global),
    })
  ),
  identifierWeights,
]);
export type GlobalRiskWeight = t.TypeOf<typeof globalRiskWeightSchema>;

const riskCategoryRiskWeightSchema = t.intersection([
  t.exact(
    t.type({
      type: t.literal(RiskWeightTypes.riskCategory),
      value: riskCategories,
    })
  ),
  identifierWeights,
]);
export type RiskCategoryRiskWeight = t.TypeOf<typeof riskCategoryRiskWeightSchema>;

export const riskWeightSchema = t.union([globalRiskWeightSchema, riskCategoryRiskWeightSchema]);
export type RiskWeightSchema = t.TypeOf<typeof riskWeightSchema>;
export type RiskWeight = RiskWeightSchema;

export const riskWeightsSchema = t.array(riskWeightSchema);
export type RiskWeightsSchema = t.TypeOf<typeof riskWeightsSchema>;
export type RiskWeights = RiskWeightsSchema;
