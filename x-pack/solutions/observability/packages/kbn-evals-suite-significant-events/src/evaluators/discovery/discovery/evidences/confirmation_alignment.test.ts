/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalVerdict } from '@kbn/significant-events-schema';
import { confirmationAlignmentEvaluator } from './confirmation_alignment';
import type { SignalEntry } from '@kbn/significant-events-schema';

const evaluate = (
  significantEvents: unknown,
  expectedConfirmedRuleUuids?: Record<string, string[]>
) =>
  confirmationAlignmentEvaluator.evaluate({
    input: { detections: [] },
    output: { significantEvents, steps: [] } as never,
    expected: { expected_confirmed_rule_uuids: expectedConfirmedRuleUuids } as never,
    metadata: null,
  });

const detection = (ruleUuid: string, verdict: SignalVerdict = 'confirms'): SignalEntry => ({
  type: 'detection',
  metadata: { rule_uuid: ruleUuid, detection_id: '1', change_point_type: 'spike', p_value: 0.01 },
  stream_name: 'logs',
  description: 'test detection',
  verdict,
});

describe('confirmationAlignmentEvaluator', () => {
  it('is unavailable when no expected confirmed rule UUIDs are declared', async () => {
    const result = await evaluate([], undefined);
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('scores 1 for an exact confirmed-membership match', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1')] }];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('matches generated event IDs by their detection-rule membership', async () => {
    const events = [{ event_id: 'agent-event-12345678', signals: [detection('r1')] }];
    expect((await evaluate(events, { 'canonical-event-id': ['r1'] })).score).toBe(1);
  });

  it('does not use one generated event for multiple expected events', async () => {
    const events = [
      {
        event_id: 'agent-event-12345678',
        signals: [detection('r1'), detection('r2')],
      },
    ];
    const result = await evaluate(events, {
      'canonical-event-one': ['r1'],
      'canonical-event-two': ['r2'],
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('canonical-event-one:');
    expect(result.explanation).toContain('canonical-event-two: missing from agent output');
  });

  it('assigns each expected event to the candidate with the highest shared confirmed-rule count', async () => {
    const events = [
      { event_id: 'agent-event-aaa', signals: [detection('r1'), detection('r2', 'refutes')] },
      { event_id: 'agent-event-bbb', signals: [detection('r2'), detection('r1', 'refutes')] },
    ];
    const result = await evaluate(events, {
      'canonical-event-one': ['r1'],
      'canonical-event-two': ['r2'],
    });
    expect(result.score).toBe(1);
  });

  it('ignores signals without a rule identity', async () => {
    const events = [
      {
        event_id: 'e1',
        signals: [detection('r1'), { type: 'esql', description: 'manual evidence' }],
      },
    ];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('fails when an expected rule is not confirmed', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1', 'inconclusive')] }];
    const result = await evaluate(events, { e1: ['r1'] });
    expect(result.score).toBe(0);
  });

  it('fails when a non-expected rule is not explicitly rejected', async () => {
    const events = [
      { event_id: 'e1', signals: [detection('r1'), detection('r2', 'inconclusive')] },
    ];
    const result = await evaluate(events, { e1: ['r1'] });
    expect(result.score).toBe(0);
  });

  it('fails when a verified non-expected rule is neither confirmed nor rejected', async () => {
    const events = [
      {
        event_id: 'e1',
        signals: [
          detection('r1'),
          {
            ...detection('r2'),
            evidence: { result: 'found' },
            collected_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
    ];
    const result = await evaluate(events, { e1: ['r1'] });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('r2');
  });

  it('accepts a non-expected rule that is explicitly rejected', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1'), detection('r2', 'refutes')] }];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('scores 0 and reports an expected event missing from the agent output', async () => {
    const result = await evaluate([], { e1: ['r1'] });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('missing from agent output');
  });

  it('averages across expected events', async () => {
    const events = [
      { event_id: 'e1', signals: [detection('r1')] },
      { event_id: 'e2', signals: [detection('r2', 'inconclusive')] },
    ];
    expect((await evaluate(events, { e1: ['r1'], e2: ['r2'] })).score).toBe(0.5);
  });

  it('accepts a non-expected rule that is off_topic', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1'), detection('r2', 'off_topic')] }];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('fails when a non-expected rule is not_checked', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1'), detection('r2', 'not_checked')] }];
    const result = await evaluate(events, { e1: ['r1'] });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('r2');
  });
});
