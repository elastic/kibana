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

  describe('bash calls run from a cortex or memories working directory', () => {
    const bash = (command: string, workingDirectory: string, result = '') => ({
      tool_id: 'nightshift_sandbox_bash',
      params: { command, working_directory: workingDirectory },
      result,
    });

    it('resolves relative file arguments against the working directory', () => {
      expect(
        extractRecallReads([
          bash('grep timeout checkout.md', '/workspace/memories'),
          bash("cat 'notes/db.txt'", '/workspace/cortex/'),
          bash('grep timeout checkout.md', '/workspace/src'),
        ])
      ).toEqual([
        { kind: 'memories', path: 'memories/checkout.md', step: 1 },
        { kind: 'cortex', path: 'cortex/notes/db.txt', step: 2 },
      ]);
    });

    it('reads each file a recursive grep exposes in its output', () => {
      const result = [
        'exit_code: 0 | stdout: ./one.md:4:checkout timeout after 30s',
        'two.md:9:retry timeout',
        './sub/three.md:2:timeout',
        'one.md:7:another match in a file already listed',
      ].join('\n');
      expect(
        extractRecallReads([bash('grep -rn timeout .', '/workspace/memories', result)])
      ).toEqual([
        { kind: 'memories', path: 'memories/one.md', step: 1 },
        { kind: 'memories', path: 'memories/two.md', step: 1 },
        { kind: 'memories', path: 'memories/sub/three.md', step: 1 },
      ]);
    });

    it('reads files from a find or grep -l listing', () => {
      const result = 'exit_code: 0 | stdout: ./a.md\n./notes/b.md\n';
      expect(
        extractRecallReads([bash("find . -name '*.md'", '/workspace/cortex', result)])
      ).toEqual([
        { kind: 'cortex', path: 'cortex/a.md', step: 1 },
        { kind: 'cortex', path: 'cortex/notes/b.md', step: 1 },
      ]);
    });

    it('credits nothing when the output names no files', () => {
      expect(
        extractRecallReads([
          bash(
            'grep -rh timeout .',
            '/workspace/memories',
            'exit_code: 0 | stdout: checkout timed out\n1.5\n10.0.0.1'
          ),
          bash('grep -r timeout .', '/workspace/memories', 'exit_code: 0'),
          bash('ls', '/workspace/memories', 'exit_code: 0 | stdout: one\ntwo'),
        ])
      ).toEqual([]);
    });
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
