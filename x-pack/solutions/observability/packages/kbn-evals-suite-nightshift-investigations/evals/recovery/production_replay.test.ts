/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { InvestigationExample } from '../investigation/types';
import { readProductionReplayDataset, replayProductionRun } from './production_replay';

const example: InvestigationExample = {
  input: {
    question: 'An alert in this investigation has recovered.',
    production: {
      steps: [{ tool_id: 'nightshift_sandbox_bash', params: { command: 'curl x' }, result: 'ok' }],
      conclusion: 'Unresolved.',
      severity: 'low',
    },
  },
  metadata: { case_id: 'case-1' },
};

const writeFile = (examples: unknown[]): string => {
  const path = join(mkdtempSync(join(tmpdir(), 'production-')), 'examples.json');
  writeFileSync(
    path,
    JSON.stringify({ description: 'test cases', tags: ['customer0-recovery'], examples })
  );
  return path;
};

describe('replayProductionRun', () => {
  it('returns the production round as a finished run the judges can read', () => {
    expect(replayProductionRun(example)).toEqual({
      case_id: 'case-1',
      query: 'An alert in this investigation has recovered.',
      workflow_status: 'complete',
      structured_report: { conclusion: 'Unresolved.', severity: 'low' },
      conversation_round_count: 1,
      tool_call_trajectory: [
        { tool_id: 'nightshift_sandbox_bash', params: { command: 'curl x' }, result: 'ok' },
      ],
      tool_call_count: 1,
    });
  });
});

describe('readProductionReplayDataset', () => {
  it('rejects an example without its production run', () => {
    const { production: _omitted, ...input } = example.input as Record<string, unknown>;

    expect(() =>
      readProductionReplayDataset(writeFile([{ ...example, input }]), 'ns-recovery-production')
    ).toThrow();
  });

  it('rejects duplicate case ids', () => {
    expect(() =>
      readProductionReplayDataset(writeFile([example, example]), 'ns-recovery-production')
    ).toThrow('Duplicate case_id: case-1');
  });
});
