/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationReport } from '../types';
import {
  clampDecisionTreeHelpfulnessScore,
  clampGoalScore,
  clampTruthfulnessScore,
  clampUnitScore,
  composeAnswerText,
  composeDecisionTreesText,
  composeEvidenceText,
  composeTrajectoryText,
  extractReferenceAnswer,
  goalScorePassed,
  normalizeDecisionTreeHelpfulnessScore,
  normalizeGoalScore,
  normalizeTruthfulnessScore,
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

describe('truthfulness score helpers', () => {
  it.each([
    [1, 0],
    [2, 0.25],
    [3, 0.5],
    [4, 0.75],
    [5, 1],
  ])('normalizes raw truthfulness score %d to %d', (raw, expected) => {
    expect(normalizeTruthfulnessScore(raw)).toBeCloseTo(expected, 5);
  });

  it('clamps and rounds out-of-range or fractional raw scores', () => {
    expect(clampTruthfulnessScore(0)).toBe(1);
    expect(clampTruthfulnessScore(9)).toBe(5);
    expect(clampTruthfulnessScore(3.4)).toBe(3);
    expect(clampTruthfulnessScore(4.6)).toBe(5);
    expect(clampTruthfulnessScore(NaN)).toBe(1);
  });
});

describe('decision tree helpfulness score helpers', () => {
  it.each([
    [1, 0],
    [2, 0.25],
    [3, 0.5],
    [4, 0.75],
    [5, 1],
  ])('normalizes raw helpfulness score %d to %d', (raw, expected) => {
    expect(normalizeDecisionTreeHelpfulnessScore(raw)).toBeCloseTo(expected, 5);
  });

  it('clamps and rounds out-of-range or fractional raw scores', () => {
    expect(clampDecisionTreeHelpfulnessScore(0)).toBe(1);
    expect(clampDecisionTreeHelpfulnessScore(9)).toBe(5);
    expect(clampDecisionTreeHelpfulnessScore(3.4)).toBe(3);
    expect(clampDecisionTreeHelpfulnessScore(NaN)).toBe(1);
  });
});

describe('composeDecisionTreesText', () => {
  it('returns an empty string when no tree was accessed', () => {
    expect(composeDecisionTreesText(undefined)).toBe('');
    expect(composeDecisionTreesText([])).toBe('');
  });

  it('renders each accessed tree under its id, with a placeholder for missing content', () => {
    const text = composeDecisionTreesText([
      { tree_id: 'symptom:kafka-consumer-lag', content: '1. Check consumer group lag.' },
      { tree_id: 'symptom:high-cpu', content: '' },
    ]);
    expect(text).toContain('### symptom:kafka-consumer-lag\n1. Check consumer group lag.');
    expect(text).toContain('### symptom:high-cpu\n(opened, no readable content captured)');
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

describe('composeAnswerText', () => {
  const report: InvestigationReport = {
    summary: 'Kafka lag grew.',
    conclusion: 'Index throttling caused consumer lag.',
    severity: 'high',
    hypotheses: [
      { candidate: 'throttling', confidence: 0.9, status: 'confirmed', reason: 'latency spiked' },
      { candidate: 'network', confidence: 0.2, status: 'dismissed' },
    ],
  };

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
  it('renders hypothesis evidence, impact, and proposed actions, tagged with their hypothesis', () => {
    const report = {
      hypotheses: [
        {
          candidate: 'throttling',
          confidence: 0.9,
          status: 'confirmed',
          evidence: [
            {
              description: 'ES rejected bulk writes: `FROM logs-*`',
              chart: { title: 'Rejected writes' },
            },
          ],
        },
        {
          candidate: 'network',
          confidence: 0.1,
          status: 'rejected',
          evidence: [{ description: 'packet loss briefly spiked' }],
        },
      ],
      impact: { summary: 'Indexing stalled', entities: [], created_at: '2026-01-01' },
      proposals: [{ title: 'Raise write queue size', comment: 'More room', status: 'pending' }],
    } as unknown as InvestigationReport;
    const text = composeEvidenceText(report);
    expect(text).toContain('[confirmed] throttling: ES rejected bulk writes: `FROM logs-*`');
    expect(text).toContain('[chart: Rejected writes]');
    expect(text).toContain('[rejected] network: packet loss briefly spiked');
    expect(text).toContain('impact: Indexing stalled');
    expect(text).toContain('proposed action: Raise write queue size');
  });
});

describe('composeTrajectoryText', () => {
  it('returns an empty string when there is no trajectory', () => {
    expect(composeTrajectoryText(undefined)).toBe('');
    expect(composeTrajectoryText([])).toBe('');
  });

  it('numbers each step with its tool id, params and result, in order', () => {
    const text = composeTrajectoryText([
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: 'decision-trees/decision_tree_high-cpu.md' },
        result: '## Symptom: high CPU',
      },
      {
        tool_id: 'nightshift_sandbox_bash',
        params: { command: 'esql ...' },
        result: 'exit_code: 0',
      },
    ]);
    expect(text.indexOf('1. nightshift_sandbox_view_file')).toBeLessThan(
      text.indexOf('2. nightshift_sandbox_bash')
    );
    expect(text).toContain('decision_tree_high-cpu.md');
    expect(text).toContain('## Symptom: high CPU');
    expect(text).toContain('exit_code: 0');
  });
});
