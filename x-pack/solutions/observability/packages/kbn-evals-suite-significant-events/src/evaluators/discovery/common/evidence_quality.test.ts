/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import {
  createEvidenceDescriptionEvaluator,
  createNarrativeFieldsEvaluator,
  createSignalEvidenceConsistencyEvaluator,
  skipWhenNoSignificantEvents,
} from './evidence_quality';

const createJudge = () => {
  const evaluate = jest.fn(async () => ({ score: 1, explanation: 'judged' }));
  const criteriaFn = jest.fn(
    () => ({ name: 'criteria', kind: 'LLM', direction: 'maximize', evaluate } as Evaluator)
  );
  return { criteriaFn, evaluate };
};

const factories = [
  createEvidenceDescriptionEvaluator,
  createNarrativeFieldsEvaluator,
  createSignalEvidenceConsistencyEvaluator,
];

describe('skipWhenNoSignificantEvents', () => {
  it('returns a reason when no event was written', () => {
    expect(skipWhenNoSignificantEvents({ significantEvents: [] } as TaskOutput)).toEqual(
      expect.stringContaining('No significant event was written')
    );
    expect(skipWhenNoSignificantEvents({} as TaskOutput)).toBeDefined();
  });

  it('returns nothing when an event was written', () => {
    expect(
      skipWhenNoSignificantEvents({ significantEvents: [{ event_id: 'e1' }] } as TaskOutput)
    ).toBeUndefined();
  });
});

describe.each(factories.map((factory) => [factory.name, factory] as const))(
  '%s',
  (_name, factory) => {
    const run = (output: unknown) => {
      const { criteriaFn, evaluate } = createJudge();
      const evaluator = factory({
        criteriaFn: criteriaFn as never,
        skipWhen: skipWhenNoSignificantEvents,
      });
      const result = evaluator.evaluate({
        input: {},
        output: output as never,
        expected: { criteria: [] },
        metadata: null,
      });
      return { result, evaluate };
    };

    it('abstains by default when no event was written', async () => {
      const { criteriaFn, evaluate } = createJudge();
      const evaluator = factory({ criteriaFn: criteriaFn as never });
      const result = await evaluator.evaluate({
        input: {},
        output: { significantEvents: [] } as never,
        expected: { criteria: [] },
        metadata: null,
      });

      expect(result.score).toBeNull();
      expect(evaluate).not.toHaveBeenCalled();
    });

    it('judges the output when an event was written', async () => {
      const { result, evaluate } = run({ significantEvents: [{ event_id: 'e1' }] });

      expect((await result).score).toBe(1);
      expect(evaluate).toHaveBeenCalledTimes(1);
    });
  }
);
