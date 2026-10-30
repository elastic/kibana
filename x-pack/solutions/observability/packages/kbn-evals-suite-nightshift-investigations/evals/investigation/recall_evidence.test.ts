/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeRecallReadsText, extractRecallReads } from './recall_evidence';

const viewFile = (filePath: string) => ({
  tool_id: 'nightshift_sandbox_view_file',
  params: { file_path: filePath },
  result: '',
});

describe('extractRecallReads', () => {
  it('finds cortex and memory files read through view-file and bash, once per path', () => {
    const reads = extractRecallReads([
      viewFile('/workspace/cortex/checkout.md'),
      {
        tool_id: 'nightshift_sandbox_bash',
        params: { command: 'cat memories/a.md | head' },
        result: '',
      },
      viewFile('/workspace/cortex/checkout.md'),
      viewFile('/workspace/src/app.ts'),
      { tool_id: 'other', params: { file_path: 'cortex/ignored.md' }, result: '' },
    ]);
    expect(reads).toEqual([
      { kind: 'cortex', path: 'cortex/checkout.md', step: 1 },
      { kind: 'memories', path: 'memories/a.md', step: 2 },
    ]);
  });

  it('resolves relative bash file arguments against a cortex or memories working directory', () => {
    const bash = (command: string, workingDirectory: string) => ({
      tool_id: 'nightshift_sandbox_bash',
      params: { command, working_directory: workingDirectory },
      result: '',
    });
    expect(
      extractRecallReads([
        bash('grep timeout checkout.md', '/workspace/memories'),
        bash("cat 'notes/db.txt'", '/workspace/cortex/'),
        bash('grep -r timeout .', '/workspace/cortex/db'),
        bash('grep timeout checkout.md', '/workspace/src'),
      ])
    ).toEqual([
      { kind: 'memories', path: 'memories/checkout.md', step: 1 },
      { kind: 'cortex', path: 'cortex/notes/db.txt', step: 2 },
      { kind: 'cortex', path: 'cortex/db', step: 3 },
    ]);
  });

  it('is empty without a trajectory', () => {
    expect(extractRecallReads(undefined)).toEqual([]);
  });

  it('renders the reads of one kind', () => {
    const reads = extractRecallReads([viewFile('cortex/a.md'), viewFile('memories/b.md')]);
    expect(composeRecallReadsText(reads, 'memories')).toBe('- memories/b.md (trajectory step 2)');
    expect(composeRecallReadsText(reads, 'cortex')).toBe('- cortex/a.md (trajectory step 1)');
  });
});
