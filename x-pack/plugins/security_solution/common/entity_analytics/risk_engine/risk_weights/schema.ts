/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RiskScoreWeight,
  RiskScoreWeightCategory,
  RiskScoreWeightGlobal,
  RiskScoreWeights,
} from '../../../api/entity_analytics/common';

// TODO REPLACE ALL USAGES WITH GENERATED TYPES
export type GlobalRiskWeight = RiskScoreWeightGlobal;

export type RiskCategoryRiskWeight = RiskScoreWeightCategory;

export type RiskWeight = RiskScoreWeight;

export type RiskWeights = RiskScoreWeights;
