/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readRecoveryExamplesFile } from './datasets';

const makeExample = (caseId: string) => ({
  input: {
    question: 'An alert fired.',
    prior_response: 'Earlier verdict.',
    alert: { alertUuid: 'uuid', alertId: 'instance' },
  },
  metadata: { case_id: caseId },
});

const writeFile = (examples: unknown[]): string => {
  const path = join(mkdtempSync(join(tmpdir(), 'recovery-')), 'examples.json');
  writeFileSync(
    path,
    JSON.stringify({ description: 'test cases', tags: ['customer0-recovery'], examples })
  );
  return path;
};

describe('readRecoveryExamplesFile', () => {
  it('names the dataset by its entry and keeps the file tags and examples', () => {
    const dataset = readRecoveryExamplesFile(writeFile([makeExample('a')]), 'ns-recovery-test');

    expect(dataset.name).toBe('ns-recovery-test');
    expect(dataset.tags).toEqual(['customer0-recovery']);
    expect(dataset.examples).toHaveLength(1);
  });

  it('rejects an example without its earlier answer', () => {
    const { prior_response: _omitted, ...input } = makeExample('a').input;

    expect(() =>
      readRecoveryExamplesFile(writeFile([{ ...makeExample('a'), input }]), 'ns-recovery-test')
    ).toThrow();
  });

  it('rejects duplicate case ids', () => {
    expect(() =>
      readRecoveryExamplesFile(writeFile([makeExample('a'), makeExample('a')]), 'ns-recovery-test')
    ).toThrow('Duplicate case_id: a');
  });
});
