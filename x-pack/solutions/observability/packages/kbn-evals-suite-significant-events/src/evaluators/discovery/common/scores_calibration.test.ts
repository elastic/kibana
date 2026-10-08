/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion } from '@kbn/evals';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryEvaluator } from '../types';
import {
  createConfidenceCalibrationEvaluator,
  createSeverityCalibrationEvaluator,
} from './scores_calibration';

type CalibrationCriteriaFn = Parameters<typeof createSeverityCalibrationEvaluator>[0]['criteriaFn'];

const buildEvent = (status: SignificantEvent['status']): SignificantEvent => ({
  '@timestamp': '2026-09-27T00:00:00.000Z',
  event_id: `event-${status}`,
  title: `Event ${status}`,
  summary: `Event is ${status}`,
  severity: 'low',
  confidence: 0.5,
  stream_names: ['logs-test'],
  status,
});

const createJudge = () => {
  const evaluate: DiscoveryEvaluator['evaluate'] = jest.fn(async () => ({
    score: 0.75,
    label: null,
    explanation: 'judged',
  }));
  const criteriaFn: CalibrationCriteriaFn = jest.fn(
    (_criteria: EvaluationCriterion[]): DiscoveryEvaluator => ({
      name: 'criteria',
      kind: 'LLM',
      direction: 'maximize',
      evaluate,
    })
  );

  return { criteriaFn, evaluate };
};

const evaluatorFactories = [
  ['severity calibration', createSeverityCalibrationEvaluator],
  ['confidence calibration', createConfidenceCalibrationEvaluator],
] as const;

describe.each(evaluatorFactories)('%s', (_name, createEvaluator) => {
  const runEvaluation = (significantEvents: SignificantEvent[]) => {
    const { criteriaFn, evaluate } = createJudge();
    const evaluator = createEvaluator({ criteriaFn });
    const result = evaluator.evaluate({
      input: { detections: [] },
      output: { significantEvents },
      expected: { criteria: [] },
      metadata: null,
    });

    return { result, criteriaFn, judgeEvaluate: evaluate };
  };

  it('skips empty significant events with a null score', async () => {
    const { result, criteriaFn, judgeEvaluate } = runEvaluation([]);

    await expect(result).resolves.toEqual({
      score: null,
      label: 'unavailable',
      explanation: 'No active significant events to evaluate',
    });
    expect(criteriaFn).not.toHaveBeenCalled();
    expect(judgeEvaluate).not.toHaveBeenCalled();
  });

  it('skips when all significant events are inactive', async () => {
    const { result, criteriaFn, judgeEvaluate } = runEvaluation([buildEvent('inactive')]);

    await expect(result).resolves.toEqual({
      score: null,
      label: 'unavailable',
      explanation: 'No active significant events to evaluate',
    });
    expect(criteriaFn).not.toHaveBeenCalled();
    expect(judgeEvaluate).not.toHaveBeenCalled();
  });

  it('invokes the criteria evaluator when at least one significant event is active', async () => {
    const significantEvents = [buildEvent('inactive'), buildEvent('active')];
    const { result, criteriaFn, judgeEvaluate } = runEvaluation(significantEvents);

    await expect(result).resolves.toMatchObject({ score: 0.75, explanation: 'judged' });
    expect(criteriaFn).toHaveBeenCalledTimes(1);
    expect(judgeEvaluate).toHaveBeenCalledWith(
      expect.objectContaining({ output: { significantEvents } })
    );
  });
});
