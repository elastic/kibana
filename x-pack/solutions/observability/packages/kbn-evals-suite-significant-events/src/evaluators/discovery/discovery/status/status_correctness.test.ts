/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { statusCorrectnessEvaluator } from './status_correctness';

const signal = (ruleUuid: string) => ({ type: 'detection', metadata: { rule_uuid: ruleUuid } });

const evaluate = ({
  inputRules,
  expectedEvents,
  writtenEvents,
}: {
  inputRules: string[];
  expectedEvents?: Array<{ rules: string[]; status?: string }>;
  writtenEvents: Array<{ rules: string[] }>;
}) =>
  statusCorrectnessEvaluator.evaluate({
    input: { detections: inputRules.map((rule_uuid) => ({ rule_uuid })) },
    output: {
      significantEvents: writtenEvents.map(({ rules }) => ({ signals: rules.map(signal) })),
      steps: [],
    } as never,
    expected: {
      expected_significant_events: expectedEvents?.map(({ rules, status }) => ({
        status,
        signals: rules.map(signal),
      })),
    } as never,
    metadata: null,
  });

describe('statusCorrectnessEvaluator', () => {
  it('is unavailable when no expected events are declared', async () => {
    const result = await evaluate({ inputRules: ['r1'], writtenEvents: [] });

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('scores 1 when every expected event is written and nothing else is', async () => {
    const result = await evaluate({
      inputRules: ['r1', 'r2', 'benign'],
      expectedEvents: [{ rules: ['r1', 'r2'] }],
      writtenEvents: [{ rules: ['r1', 'r2'] }],
    });

    expect(result.score).toBe(1);
  });

  it('fails an event written for a detection no expected event covers', async () => {
    const result = await evaluate({
      inputRules: ['r1', 'benign'],
      expectedEvents: [{ rules: ['r1'] }],
      writtenEvents: [{ rules: ['r1'] }, { rules: ['benign'] }],
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('benign');
  });

  it('fails an expected event that was not written', async () => {
    const result = await evaluate({
      inputRules: ['r1', 'r2'],
      expectedEvents: [{ rules: ['r1'] }, { rules: ['r2'] }],
      writtenEvents: [{ rules: ['r1'] }],
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('r2');
  });

  it('does not owe a write for an expected inactive event', async () => {
    const result = await evaluate({
      inputRules: ['r1', 'benign'],
      expectedEvents: [
        { rules: ['r1'], status: 'active' },
        { rules: ['benign'], status: 'inactive' },
      ],
      writtenEvents: [{ rules: ['r1'] }],
    });

    expect(result.score).toBe(1);
  });

  it('fails an event written for an expected inactive event', async () => {
    const result = await evaluate({
      inputRules: ['r1', 'benign'],
      expectedEvents: [
        { rules: ['r1'], status: 'active' },
        { rules: ['benign'], status: 'inactive' },
      ],
      writtenEvents: [{ rules: ['r1'] }, { rules: ['benign'] }],
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('benign');
  });

  it('scores 0 when nothing is written for an expected event', async () => {
    const result = await evaluate({
      inputRules: ['r1'],
      expectedEvents: [{ rules: ['r1'] }],
      writtenEvents: [],
    });

    expect(result.score).toBe(0);
  });
});
