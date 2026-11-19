/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationTaskOutput, TrajectoryStep } from '../investigation/types';
import { evidenceFamiliesEvaluator, familiesReached, toStrategyStatuses } from './judges';
import { CAUSAL_STRATEGY_IDS, checklistScore } from './strategies';

const step = (command: string): TrajectoryStep => ({
  tool_id: 'nightshift_sandbox_bash',
  params: { command },
  result: '',
});

describe('toStrategyStatuses', () => {
  it('gives every strategy a status and counts one the judge left out as not run', () => {
    const statuses = toStrategyStatuses({
      strategies: [{ id: 'alert_record', status: 'ran', step: 2, note: '' }],
    });

    expect(Object.keys(statuses)).toEqual([...CAUSAL_STRATEGY_IDS]);
    expect(statuses.alert_record).toBe('ran');
    expect(statuses.rule_execution_trace).toBe('not_run');
  });
});

describe('checklistScore', () => {
  it('scores a run as 1, a blocked try as half and a skipped strategy as 0', () => {
    const all = (status: 'ran' | 'blocked' | 'not_run') =>
      Object.fromEntries(CAUSAL_STRATEGY_IDS.map((id) => [id, status]));

    expect(checklistScore(all('ran'))).toBe(1);
    expect(checklistScore(all('blocked'))).toBe(0.5);
    expect(checklistScore(all('not_run'))).toBe(0);
  });
});

describe('familiesReached', () => {
  it('recognises the data a run read from its tool-call arguments', () => {
    const reached = familiesReached([
      step('curl "$URL/.alerts-*/_search" -d \'{"term":{"kibana.alert.uuid":"x"}}\''),
      step('curl "$URL/metrics-us-east-1:metrics-apm.transaction.1m*/_search"'),
      step('curl "$URL/.kibana-event-log*/_search"'),
    ]);

    expect(reached).toEqual(
      expect.arrayContaining([
        'alert_documents',
        'apm_metrics',
        'rule_event_log',
        'remote_clusters',
      ])
    );
    expect(reached).not.toContain('source_code');
  });
});

describe('evidenceFamiliesEvaluator', () => {
  it('reports n/a for a run with no tool calls', async () => {
    const params = {
      input: { question: 'q' },
      output: { case_id: 'c', query: 'q' } satisfies InvestigationTaskOutput,
      expected: undefined,
      metadata: undefined,
    };
    const result = await evidenceFamiliesEvaluator.evaluate(
      params as unknown as Parameters<typeof evidenceFamiliesEvaluator.evaluate>[0]
    );

    expect(result.score).toBeNull();
  });
});
