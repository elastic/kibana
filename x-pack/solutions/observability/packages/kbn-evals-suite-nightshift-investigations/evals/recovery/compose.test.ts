/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertRecoveryRound } from '@kbn/nightshift-investigations-plugin/server/client/build_investigation_message';
import type { InvestigationExample } from '../investigation/types';
import {
  composeEarlierRoundContext,
  composeRecoveryQuestion,
  prepareRecoveryExample,
} from './compose';

const example: InvestigationExample = {
  input: {
    question: 'An alert fired. Investigate the alert.',
    prior_response: 'Earlier verdict: chronic failure, cause unknown.',
    alert: {
      alertUuid: 'uuid-1',
      alertId: 'instance-1',
      ruleName: 'Rule A',
      recoveredAt: '2026-11-12T09:17:53.302Z',
    },
  },
  metadata: { case_id: 'case-1' },
};

describe('composeRecoveryQuestion', () => {
  it('is the recovery message, which fits the start route without the earlier round', () => {
    const question = composeRecoveryQuestion(example);

    expect(isAlertRecoveryRound(question)).toBe(true);
    expect(question).toContain('Alert "Rule A" (UUID uuid-1, instance "instance-1")');
    expect(question).not.toContain('Earlier verdict');
  });

  it('rejects an example without its earlier answer', () => {
    expect(() =>
      composeRecoveryQuestion({
        ...example,
        input: { question: example.input.question, alert: example.input.alert },
      })
    ).toThrow();
  });
});

describe('composeEarlierRoundContext', () => {
  it('carries the earlier round, with its numbered tool calls between request and answer', () => {
    const { earlier_round: earlierRound } = composeEarlierRoundContext({
      ...example,
      input: {
        ...example.input,
        prior_steps: [
          {
            tool_id: 'nightshift_sandbox_bash',
            params: { command: 'curl x' },
            result: 'ok',
            note: 'Checking',
          },
          { tool_id: 'attachments_read', params: { id: 'a' }, result: 'hypotheses' },
        ],
      },
    });

    expect(Object.keys(earlierRound)).toEqual(['request', 'steps', 'your_answer']);
    expect(earlierRound.steps).toEqual([
      {
        step: 1,
        tool: 'nightshift_sandbox_bash',
        arguments: { command: 'curl x' },
        result: 'ok',
        note: 'Checking',
      },
      { step: 2, tool: 'attachments_read', arguments: { id: 'a' }, result: 'hypotheses' },
    ]);
  });

  it('leaves the steps out for a dataset that has none', () => {
    expect(Object.keys(composeEarlierRoundContext(example).earlier_round)).toEqual([
      'request',
      'your_answer',
    ]);
  });
});

describe('prepareRecoveryExample', () => {
  it('carries the earlier round as context and leaves the stored pieces', () => {
    const prepared = prepareRecoveryExample(example);

    expect(prepared.input.question).toBe(composeRecoveryQuestion(example));
    expect(prepared.input.context).toEqual({
      earlier_round: {
        request: 'An alert fired. Investigate the alert.',
        your_answer: 'Earlier verdict: chronic failure, cause unknown.',
      },
    });
    expect(prepared.input.prior_response).toBe(example.input.prior_response);
    expect(prepared.metadata).toEqual(example.metadata);
  });
});
