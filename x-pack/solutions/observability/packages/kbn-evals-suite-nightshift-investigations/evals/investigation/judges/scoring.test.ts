/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStructuredOutput } from '@kbn/nightshift-investigations-plugin/common';
import {
  clampGoalScore,
  clampUnitScore,
  composeAnswerText,
  composeEvidenceText,
  extractReferenceAnswer,
  goalScorePassed,
  hasLeakageIndicators,
  normalizeGoalScore,
} from './scoring';

describe('goal score helpers', () => {
  it.each([
    [1, 0],
    [2, 0.25],
    [3, 0.5],
    [4, 0.75],
    [5, 1],
  ])('normalizes raw goal score %d to %d', (raw, expected) => {
    expect(normalizeGoalScore(raw)).toBeCloseTo(expected, 5);
  });

  it('clamps and rounds out-of-range or fractional raw scores', () => {
    expect(clampGoalScore(0)).toBe(1);
    expect(clampGoalScore(9)).toBe(5);
    expect(clampGoalScore(3.4)).toBe(3);
    expect(clampGoalScore(NaN)).toBe(1);
  });

  it('treats >= 4 as a pass, matching deductive goal_achieved', () => {
    expect(goalScorePassed(3)).toBe(false);
    expect(goalScorePassed(4)).toBe(true);
    expect(goalScorePassed(5)).toBe(true);
    // Fractional model output is rounded before the threshold check (3.4 -> 3, 3.9 -> 4).
    expect(goalScorePassed(3.4)).toBe(false);
    expect(goalScorePassed(3.9)).toBe(true);
  });
});

describe('clampUnitScore', () => {
  it('bounds values into [0, 1] and defaults non-finite input to 0', () => {
    expect(clampUnitScore(0.42)).toBe(0.42);
    expect(clampUnitScore(-1)).toBe(0);
    expect(clampUnitScore(2)).toBe(1);
    expect(clampUnitScore(Infinity)).toBe(0);
  });
});

describe('extractReferenceAnswer', () => {
  it('reads reference_answer first, then falls back through deductive keys', () => {
    expect(extractReferenceAnswer({ reference_answer: 'primary' })).toBe('primary');
    expect(extractReferenceAnswer({ answer: 'fallback' })).toBe('fallback');
    expect(extractReferenceAnswer({ ground_truth: '  gt  ' })).toBe('gt');
    expect(extractReferenceAnswer({ response: 'resp' })).toBe('resp');
  });

  it('returns undefined when absent, blank, or non-string', () => {
    expect(extractReferenceAnswer(undefined)).toBeUndefined();
    expect(extractReferenceAnswer({})).toBeUndefined();
    expect(extractReferenceAnswer({ reference_answer: '   ' })).toBeUndefined();
    expect(extractReferenceAnswer({ reference_answer: 42 })).toBeUndefined();
  });
});

describe('hasLeakageIndicators', () => {
  it('flags post-incident resolution language', () => {
    expect(hasLeakageIndicators('The incident resolved after rollback completed.')).toBe(true);
    expect(hasLeakageIndicators('This was a post-incident note.')).toBe(true);
    expect(hasLeakageIndicators('PEV-123 was later mitigated.')).toBe(true);
  });

  it('does not flag ordinary investigation prose', () => {
    expect(hasLeakageIndicators('Error rate rose after the deploy at 18:00 UTC.')).toBe(false);
    expect(hasLeakageIndicators('')).toBe(false);
  });
});

describe('composeAnswerText', () => {
  const report: InvestigationStructuredOutput = {
    summary: 'Kafka lag grew.',
    conclusion: 'Index throttling caused consumer lag.',
    severity: '60-high',
    hypotheses: [
      { candidate: 'throttling', confidence: 0.9, status: 'confirmed', reason: 'latency spiked' },
      { candidate: 'network', confidence: 0.2, status: 'rejected' },
    ],
  } as InvestigationStructuredOutput;

  it('leads with the conclusion and includes confidence-sorted hypotheses', () => {
    const text = composeAnswerText(report);
    expect(text).toContain('Conclusion: Index throttling caused consumer lag.');
    expect(text).toContain('Summary: Kafka lag grew.');
    expect(text.indexOf('throttling')).toBeLessThan(text.indexOf('network'));
    expect(text).toContain('90% confidence');
  });

  it('returns an empty string for a missing report', () => {
    expect(composeAnswerText(undefined)).toBe('');
  });
});

describe('composeEvidenceText', () => {
  it('renders hypothesis evidence and recommendations', () => {
    const report = {
      hypotheses: [
        {
          candidate: 'throttling',
          confidence: 0.9,
          status: 'confirmed',
          evidence: [{ description: 'ES rejected bulk writes', esql_query: 'FROM logs-*' }],
        },
      ],
      recommendations: [{ title: 'Raise write queue size', confidence: 0.8 }],
    } as unknown as InvestigationStructuredOutput;
    const text = composeEvidenceText(report);
    expect(text).toContain('ES rejected bulk writes');
    expect(text).toContain('esql: FROM logs-*');
    expect(text).toContain('recommendation: Raise write queue size');
  });
});
