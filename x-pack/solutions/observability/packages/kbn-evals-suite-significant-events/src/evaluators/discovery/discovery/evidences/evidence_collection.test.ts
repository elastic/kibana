/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, Detection, SignalEntry } from '@kbn/significant-events-schema';
import { evidenceCollectionEvaluator } from './evidence_collection';

const detection = (ruleUuid: string): Omit<Detection, 'processed'> => ({
  '@timestamp': '2026-07-17T00:00:00.000Z',
  detection_id: `${ruleUuid}-det`,
  rule_uuid: ruleUuid,
  rule_name: ruleUuid,
  stream_name: 'logs',
  change_point_type: 'spike',
  p_value: 0,
});

const detectionSignal = (
  ruleUuid: string,
  evidence: 'found' | 'quiet' | 'missing' = 'found'
): SignalEntry => ({
  type: 'detection',
  description:
    evidence === 'quiet'
      ? 'No backed query KI matched this detection.'
      : 'Found: checkout payment timeout to payment API. Impact: checkout requests fail.',
  verdict:
    evidence === 'found' ? 'confirms' : evidence === 'quiet' ? 'not_checked' : 'inconclusive',
  stream_name: 'logs',
  ...(evidence === 'found'
    ? { evidence: { esql_query: 'FROM logs | LIMIT 1', result: 'found' as const } }
    : evidence === 'quiet'
    ? { evidence: null }
    : {}),
  metadata: {
    rule_uuid: ruleUuid,
    rule_name: ruleUuid,
    detection_id: `${ruleUuid}-det`,
    change_point_type: 'spike',
    p_value: 0,
  },
});

const evaluate = (events: Partial<SignificantEvent>[], ruleUuids: string[]) =>
  evidenceCollectionEvaluator.evaluate({
    input: {
      detections: ruleUuids.map(detection),
    },
    output: {
      significantEvents: events as SignificantEvent[],
    },
    expected: {} as never,
    metadata: null,
  });

const evaluateWithExpected = (
  events: Partial<SignificantEvent>[],
  ruleUuids: string[],
  expectedEvents: Partial<SignificantEvent>[]
) =>
  evidenceCollectionEvaluator.evaluate({
    input: {
      detections: ruleUuids.map(detection),
    },
    output: {
      significantEvents: events as SignificantEvent[],
    },
    expected: { expected_significant_events: expectedEvents } as never,
    metadata: null,
  });

describe('evidenceCollectionEvaluator', () => {
  it('is unavailable when there are no input detections', async () => {
    expect((await evaluate([{ signals: [] }], [])).score).toBeNull();
  });

  it('scores 1 when every input rule has collected ES|QL evidence', async () => {
    const events: Partial<SignificantEvent>[] = [
      {
        signals: [detectionSignal('r1'), detectionSignal('r2')],
      },
    ];
    const result = await evaluate(events, ['r1', 'r2']);

    expect(result.score).toBe(1);
    expect(result.explanation).toContain('2 input rule(s)');
  });

  it('gives partial credit when an input rule is omitted', async () => {
    const events: Partial<SignificantEvent>[] = [
      {
        signals: [detectionSignal('r1')],
      },
    ];
    const result = await evaluate(events, ['r1', 'r2']);

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('missing signal for input rule "r2"');
  });

  it('accepts an explicitly quiet signal with no backed query KI', async () => {
    const result = await evaluate([{ signals: [detectionSignal('r1', 'quiet')] }], ['r1']);

    expect(result.score).toBe(1);
  });

  it.each(['missing'] as const)('rejects %s evidence for an input rule', async (evidence) => {
    const result = await evaluate([{ signals: [detectionSignal('r1', evidence)] }], ['r1']);

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('no ES|QL evidence for input rule "r1"');
  });

  it('rejects duplicate signals', async () => {
    const result = await evaluate(
      [
        {
          signals: [detectionSignal('r1'), detectionSignal('r1')],
        },
      ],
      ['r1']
    );

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('duplicate signals for input rule "r1"');
  });

  it('rejects detection signals whose UUID is not in the input batch', async () => {
    const result = await evaluate([{ signals: [detectionSignal('unexpected')] }], ['r1']);

    expect(result).toMatchObject({ score: 0, label: 'unexpected-rule-uuid' });
    expect(result.explanation).toContain('"unexpected"');
  });
  describe('with expected events declared', () => {
    const expectedActive: Partial<SignificantEvent> = {
      status: 'active',
      signals: [detectionSignal('rule-a'), detectionSignal('rule-b')],
    };

    it('owes no signal for an input rule outside every expected active event', async () => {
      const result = await evaluateWithExpected(
        [{ signals: [detectionSignal('rule-a'), detectionSignal('rule-b')] }],
        ['rule-a', 'rule-b', 'rule-benign'],
        [expectedActive]
      );

      expect(result.score).toBe(1);
    });

    it('still penalizes a missing signal for a rule in the expected active event', async () => {
      const result = await evaluateWithExpected(
        [{ signals: [detectionSignal('rule-a')] }],
        ['rule-a', 'rule-b', 'rule-benign'],
        [expectedActive]
      );

      expect(result.score).toBe(0.5);
      expect(result.explanation).toContain('missing signal for input rule "rule-b"');
      expect(result.explanation).not.toContain('rule-benign');
    });

    it('does not treat an expected inactive event as one that owes signals', async () => {
      const result = await evaluateWithExpected(
        [{ signals: [detectionSignal('rule-a')] }],
        ['rule-a', 'rule-quiet'],
        [
          { status: 'active', signals: [detectionSignal('rule-a')] },
          { status: 'inactive', signals: [detectionSignal('rule-quiet', 'quiet')] },
        ]
      );

      expect(result.score).toBe(1);
    });

    it('is unavailable when no expected event is active', async () => {
      const result = await evaluateWithExpected(
        [],
        ['rule-benign'],
        [{ status: 'inactive', signals: [detectionSignal('rule-benign', 'quiet')] }]
      );

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });

    it('still rejects a signal for a rule that is not in the input batch', async () => {
      const result = await evaluateWithExpected(
        [{ signals: [detectionSignal('rule-a'), detectionSignal('rule-stranger')] }],
        ['rule-a', 'rule-b'],
        [expectedActive]
      );

      expect(result.score).toBe(0);
      expect(result.label).toBe('unexpected-rule-uuid');
    });
  });
});
