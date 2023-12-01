/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';

/**
 * CriticalityModifiers are used to adjust the risk score based on the criticality of the asset.
 * TODO fix modifier values
 */
export const CriticalityModifiers = {
  very_important: 1,
  important: 1,
  normal: 1,
  not_important: 1,
};

export const getCriticalityModifier = (
  criticalityLevel?: AssetCriticalityRecord['criticality_level']
): number | undefined => {
  if (criticalityLevel == null) {
    return;
  }

  return CriticalityModifiers[criticalityLevel];
};

/**
 * Applies asset criticality to a normalized risk score using bayesian inference.
 * @param modifier - The criticality modifier to apply to the score.
 * @param score - The normalized risk score to which the criticality modifier is applied
 *
 * @returns The risk score with the criticality modifier applied.
 */
export const applyCriticalityToScore = ({
  modifier,
  score,
}: {
  modifier: number | undefined;
  score: number;
}): number => {
  const factor = modifier ?? 1;
  const priorProbability = score / (100 - Math.min(score, 99));
  const newProbability = priorProbability * factor;
  return Math.floor((100 * newProbability) / (1 + newProbability));
};
