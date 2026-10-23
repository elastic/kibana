/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readConnectorProbeDataset } from './datasets';

describe('readConnectorProbeDataset', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'connector-probe-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads probes from the given file and tags them as connector probes', () => {
    const path = join(dir, 'probes.json');
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/probe-test',
        tags: ['quick'],
        examples: [
          {
            input: { question: 'Count logs-* for the last 15 minutes.' },
            output: { reference_answer: 'The agent runs one bounded count.' },
            metadata: { case_id: 'count' },
          },
        ],
      })
    );

    const dataset = readConnectorProbeDataset(path);

    expect(dataset.name).toBe('nightshift/probe-test');
    expect(dataset.tags).toEqual(['nightshift', 'connector-probe', 'quick']);
    expect(dataset.examples).toHaveLength(1);
  });

  it('requires an examples file', () => {
    const { NIGHTSHIFT_PROBE_EXAMPLES_FILE: previous } = process.env;
    delete process.env.NIGHTSHIFT_PROBE_EXAMPLES_FILE;
    try {
      expect(() => readConnectorProbeDataset()).toThrow('NIGHTSHIFT_PROBE_EXAMPLES_FILE');
    } finally {
      if (previous !== undefined) process.env.NIGHTSHIFT_PROBE_EXAMPLES_FILE = previous;
    }
  });
});
