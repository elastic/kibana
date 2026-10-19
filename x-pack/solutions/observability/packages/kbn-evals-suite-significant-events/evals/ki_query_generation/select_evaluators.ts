/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';

import { expectedGenerationOutcomeEvaluator } from '../../src/evaluators/ki_query_generation/expected_generation_outcome';

const QUERY_GENERATION_EVALUATORS_ENV = 'KI_QUERY_GENERATION_EVALUATORS';

const selectEvaluatorsBySharedVariable = selectEvaluators as <TEvaluator extends { name: string }>(
  evaluators: TEvaluator[]
) => TEvaluator[];

const parseQueryGenerationEvaluatorSelection = (rawSelection: string): string[] => {
  const requested = rawSelection.split(',').map((name) => name.trim());
  if (requested.some((name) => name.length === 0)) {
    throw new Error(
      `${QUERY_GENERATION_EVALUATORS_ENV} must be a comma-separated list of evaluator names ` +
        `without empty items; received ${JSON.stringify(rawSelection)}`
    );
  }
  return [...new Set(requested)];
};

/**
 * Applies the strict query-generation evaluator selection when configured.
 * Otherwise it preserves the shared `SELECTED_EVALUATORS` behavior used by
 * the rest of the suite.
 */
export const selectQueryGenerationEvaluators = <TEvaluator extends { name: string }>(
  evaluators: TEvaluator[]
): TEvaluator[] => {
  if (evaluators.length === 0) {
    throw new Error('Cannot select evaluators from an empty list');
  }

  const rawSelection = process.env[QUERY_GENERATION_EVALUATORS_ENV];
  if (rawSelection === undefined) {
    return selectEvaluatorsBySharedVariable(evaluators);
  }

  const requested = parseQueryGenerationEvaluatorSelection(rawSelection);
  const available = evaluators.map((evaluator) => evaluator.name);
  const unknown = requested.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown evaluator(s) requested via ${QUERY_GENERATION_EVALUATORS_ENV}: ${unknown.join(
        ', '
      )}. ` + `Available: ${available.join(', ')}.`
    );
  }

  const selected = evaluators.filter((evaluator) => requested.includes(evaluator.name));
  return selected;
};

/**
 * Returns the mandatory evaluator for the empty-datastream safety canary.
 */
export const getEmptyDatastreamEvaluators = () => [expectedGenerationOutcomeEvaluator];
