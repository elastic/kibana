/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRestorableArchiveEntry } from './utils';

describe('isRestorableArchiveEntry', () => {
  it.each([
    'src/platform/packages/shared/kbn-std/target/types/index.d.ts',
    'src/platform/packages/shared/kbn-std/target/types/tsconfig.type_check.tsbuildinfo',
    'x-pack/solutions/observability/plugins/apm/tsconfig.type_check.json',
    'tsconfig.type_check.json',
  ])('restores %s', (entryPath) => {
    expect(isRestorableArchiveEntry(entryPath, 'File')).toBe(true);
  });

  it.each([
    '.buildkite/scripts/lifecycle/pre_command.sh',
    '.git/hooks/pre-commit',
    'node_modules/typescript/lib/tsc.js',
    'packages/foo/node_modules/bar/target/types/index.d.ts',
    'src/foo/target/types/index.js',
    'src/foo/target/types/../../../.git/hooks/post-checkout.d.ts',
    '/etc/target/types/index.d.ts',
  ])('skips %s', (entryPath) => {
    expect(isRestorableArchiveEntry(entryPath, 'File')).toBe(false);
  });

  it('skips symlinks', () => {
    expect(isRestorableArchiveEntry('src/foo/target/types/index.d.ts', 'SymbolicLink')).toBe(false);
  });
});
