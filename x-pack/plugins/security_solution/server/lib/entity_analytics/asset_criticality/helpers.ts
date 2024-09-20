/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fp from 'lodash/fp';

import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import type { ESFilter } from '@kbn/es-types';
import { CriticalityModifiers } from '../../../../common/entity_analytics/asset_criticality';
import type { CriticalityLevel } from '../../../../common/entity_analytics/asset_criticality/types';
import { RISK_SCORING_NORMALIZATION_MAX } from '../risk_score/constants';
import { CRITICALITY_VALUES } from './constants';

/**
 * Retrieves the criticality modifier for a given criticality level.
 *
 * @param criticalityLevel The criticality level for which to get the modifier.
 * @returns The associated criticality modifier for the given criticality level.
 */
export const getCriticalityModifier = (criticalityLevel?: CriticalityLevel): number | undefined => {
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
  if (modifier == null) {
    return score;
  }

  return bayesianUpdate({ max: RISK_SCORING_NORMALIZATION_MAX, modifier, score });
};

/**
 * Updates a score with the given modifier using bayesian inference.
 * @param modifier - The modifier to be applied to the score.
 * @param score - The score to modifiers are applied
 * @param max - The maximum value of the score.
 *
 * @returns The updated score with modifiers applied
 */
export const bayesianUpdate = ({
  max,
  modifier,
  score,
}: {
  max: number;
  modifier: number;
  score: number;
}) => {
  const priorProbability = score / (max - score);
  const newProbability = priorProbability * modifier;
  return (max * newProbability) / (1 + newProbability);
};

export const addNotDeletedClause: (query: ESFilter) => ESFilter = fp.update(
  'query.bool.must_not',
  (val: QueryDslBoolQuery['must_not']) => {
    const notDeleted: QueryDslBoolQuery['must_not'] = {
      match: { criticality_level: CRITICALITY_VALUES.DELETED },
    };
    if (!val) {
      return notDeleted;
    }

    if (Array.isArray(val)) {
      return [...val, notDeleted];
    }

    return [val, notDeleted];
  }
);
