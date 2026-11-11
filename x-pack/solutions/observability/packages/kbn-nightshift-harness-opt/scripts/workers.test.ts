/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { assignGroups } from './workers';
import { EDITABLE_FILES, treeHash, variantHashOf } from './candidate_workspace';

describe('assignGroups', () => {
  it('spreads groups so the busiest worker carries as little as possible', () => {
    const groups = new Map<string, number[]>([
      ['a', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
      ['b', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]],
      ['c', [1, 2, 3, 4, 5]],
      ['d', [1, 2, 3, 4, 5]],
      ['e', [1, 2, 3, 4, 5]],
      ['f', [1, 2, 3, 4, 5]],
      ['g', [1, 2, 3, 4, 5]],
      ['h', [1, 2, 3, 4, 5]],
    ]);
    const shards = assignGroups(groups, 4, 16);
    const loads = shards.map((shard) => [...shard.values()].flat().length);
    expect(loads.reduce((a, b) => a + b, 0)).toBe(60);
    // 8 groups of at most 16 runs are 8 phases: two per worker, never three.
    expect(shards.map((shard) => shard.size)).toEqual([2, 2, 2, 2]);
    expect(Math.max(...loads)).toBe(20);
    // Every group lands on exactly one worker, whole.
    expect(shards.flatMap((shard) => [...shard.keys()]).sort()).toEqual([...groups.keys()].sort());
  });

  it('leaves extra workers empty', () => {
    const shards = assignGroups(new Map([['a', [1]]]), 3);
    expect(shards.map((shard) => shard.size)).toEqual([1, 0, 0]);
  });
});

describe('variantHashOf', () => {
  it('matches treeHash of an unedited worktree', () => {
    // The harness checkout's editable files are committed as-is.
    expect(variantHashOf(REPO_ROOT, [])).toBe(treeHash(REPO_ROOT));
  });

  it('changes with an edit', () => {
    expect(variantHashOf(REPO_ROOT, [{ path: EDITABLE_FILES[0], content: 'x' }])).not.toBe(
      variantHashOf(REPO_ROOT, [])
    );
  });
});
