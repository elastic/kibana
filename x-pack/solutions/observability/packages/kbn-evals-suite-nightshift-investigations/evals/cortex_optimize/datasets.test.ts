/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readCortexReplayDataset } from './datasets';
import { CORTEX_REPLAY_EXAMPLE_KINDS } from './types';

const example = (caseId: string) => ({
  input: {
    rounds: [
      { kind: 'initial', user_message: 'Why?', assistant_message: 'Unknown.', tool_calls: [] },
    ],
  },
  output: {},
  metadata: { case_id: caseId, kind: 'noop' },
});

const writeFile = (content: unknown): string => {
  const path = join(mkdtempSync(join(tmpdir(), 'cortex-replay-')), 'replay.json');
  writeFileSync(path, JSON.stringify(content));
  return path;
};

describe('readCortexReplayDataset', () => {
  it('loads the bundled synthetic examples by default', () => {
    const dataset = readCortexReplayDataset();

    expect(dataset.name).toBe('nightshift/cortex-optimize-synthetic');
    expect(dataset.tags).toEqual(expect.arrayContaining(['nightshift', 'cortex-optimize']));
    expect(dataset.examples.length).toBeGreaterThan(0);
  });

  it('covers every kind of replay in the bundled examples', () => {
    const kinds = new Set(readCortexReplayDataset().examples.map(({ metadata }) => metadata.kind));

    expect([...kinds].sort()).toEqual([...CORTEX_REPLAY_EXAMPLE_KINDS].sort());
  });

  it('keeps every bundled case id distinct', () => {
    const ids = readCortexReplayDataset().examples.map(({ metadata }) => metadata.case_id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills the defaults of an example that states only its input', () => {
    const [loaded] = readCortexReplayDataset(
      writeFile({ dataset: 'nightshift/private', examples: [example('a')] })
    ).examples;

    expect(loaded.input.seed_pages).toEqual([]);
    expect(loaded.output).toEqual({
      must_capture: [],
      must_not: [],
      effects: [],
      max_pages_matching: [],
    });
  });

  it('rejects a dataset name outside the nightshift namespace', () => {
    expect(() =>
      readCortexReplayDataset(writeFile({ dataset: 'private', examples: [example('a')] }))
    ).toThrow();
  });

  it('rejects duplicate case ids', () => {
    expect(() =>
      readCortexReplayDataset(
        writeFile({ dataset: 'nightshift/private', examples: [example('a'), example('a')] })
      )
    ).toThrow('Duplicate case_id: a');
  });

  it('rejects a round of an unknown kind', () => {
    const bad = example('a');
    bad.input.rounds[0].kind = 'something_else';

    expect(() =>
      readCortexReplayDataset(writeFile({ dataset: 'nightshift/private', examples: [bad] }))
    ).toThrow();
  });
});
