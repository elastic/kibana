/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getTscInvocation } from './run_tsc';

describe('getTscInvocation', () => {
  it('runs the TypeScript 7 compiler used by CI, not the typescript@6 bin', () => {
    const { cmd } = getTscInvocation({});

    expect(cmd.split(Path.sep).join('/')).toMatch(/(^|\/)node_modules\/typescript-7\/bin\/tsc$/);
    const pkgJsonPath = Path.resolve(REPO_ROOT, cmd, '..', '..', 'package.json');
    const { version } = JSON.parse(Fs.readFileSync(pkgJsonPath, 'utf8'));
    expect(version).toMatch(/^7\./);
  });

  it('passes tsgo concurrency flags and a Go memory limit instead of a Node heap size', () => {
    const { args, env } = getTscInvocation({
      KBN_TYPE_CHECK_BUILDERS: '5',
      KBN_TYPE_CHECK_CHECKERS: '2',
      KBN_TYPE_CHECK_MEMORY_LIMIT_MB: '8192',
    });

    expect(args).toEqual(['--builders', '5', '--checkers', '2']);
    expect(env).toEqual({ GOMEMLIMIT: '8192MiB' });
  });
});
