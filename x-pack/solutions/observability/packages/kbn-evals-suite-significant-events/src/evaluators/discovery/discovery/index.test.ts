/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createDiscoveryEvaluators } from '.';

const LLM_EVALUATORS_THAT_NEED_AN_EVENT = [
  'scenario_criteria',
  'evidence_description_quality',
  'narrative_fields_quality',
  'signal_evidence_consistency',
];

describe('createDiscoveryEvaluators', () => {
  it.each(LLM_EVALUATORS_THAT_NEED_AN_EVENT)(
    '%s abstains without calling the judge when no event was written',
    async (name) => {
      const judge = jest.fn(async () => ({ score: 0, explanation: 'judged' }));
      const criteriaFn = jest.fn(
        () =>
          ({ name: 'criteria', kind: 'LLM', direction: 'maximize', evaluate: judge } as Evaluator)
      );
      const evaluator = createDiscoveryEvaluators({
        criteriaFn: criteriaFn as never,
        criteria: [{ id: 'c1', text: 'Should do the thing', score: 1 }],
      }).find((candidate) => candidate.name === name);

      const result = await evaluator?.evaluate({
        input: {},
        output: { significantEvents: [] },
        expected: {},
        metadata: null,
      } as never);

      expect(result).toEqual(expect.objectContaining({ score: null, label: 'unavailable' }));
      expect(judge).not.toHaveBeenCalled();
    }
  );
});
