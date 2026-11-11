/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createRunCache, isInfrastructureFailure } from './cache';
import type { TaskRun } from './runner';

const parts = {
  kind: 'orca' as const,
  variantHash: 'aaaa',
  worktree: REPO_ROOT,
  agentConnectorId: 'haiku',
  judgeConnectorId: 'judge',
  telemetryVariant: 'no-flags' as const,
};

describe('run cache', () => {
  let root: string;
  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'harness-cache-'));
    process.env.NIGHTSHIFT_HARNESS_DIR = root;
  });
  afterEach(() => {
    delete process.env.NIGHTSHIFT_HARNESS_DIR;
    Fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns a stored rollout with its trace, per task and rollout', () => {
    const tracePath = Path.join(root, 'trace.json');
    Fs.writeFileSync(tracePath, '{"case_id":"c1"}');
    const cache = createRunCache(parts);
    cache.put('task-1', { rollout: 2, reward: 1, tracePath } as TaskRun);
    expect(cache.get('task-1', 2)).toEqual({
      run: { rollout: 2, reward: 1, tracePath },
      trace: '{"case_id":"c1"}',
    });
    expect(cache.get('task-1', 0)).toBeUndefined();
    expect(cache.get('task-2', 2)).toBeUndefined();
  });

  it('keys on every input that changes the outcome', () => {
    const key = createRunCache(parts).key;
    expect(createRunCache(parts).key).toBe(key);
    expect(createRunCache({ ...parts, variantHash: 'bbbb' }).key).not.toBe(key);
    expect(createRunCache({ ...parts, agentConnectorId: 'sonnet' }).key).not.toBe(key);
    expect(createRunCache({ ...parts, judgeConnectorId: 'other' }).key).not.toBe(key);
    expect(createRunCache({ ...parts, telemetryVariant: 'full' }).key).not.toBe(key);
    expect(createRunCache({ ...parts, kind: 'customer0' }).key).not.toBe(key);
  });
});

describe('isInfrastructureFailure', () => {
  it('skips harness and infrastructure failures, keeps the agent’s own', () => {
    expect(isInfrastructureFailure({ judgeError: true } as TaskRun)).toBe(true);
    expect(isInfrastructureFailure({ executionError: 'TypeError: fetch failed' } as TaskRun)).toBe(
      true
    );
    expect(
      isInfrastructureFailure({ executionError: 'Investigation x outlived its timeout' } as TaskRun)
    ).toBe(true);
    expect(isInfrastructureFailure({ executionError: 'no verdict recorded' } as TaskRun)).toBe(
      false
    );
    expect(isInfrastructureFailure({ reward: 0.3 } as TaskRun)).toBe(false);
  });
});
