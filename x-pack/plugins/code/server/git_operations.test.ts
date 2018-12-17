/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import Git, { CloneOptions } from 'nodegit';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import { getDefaultBranch } from './git_operations';

jest.setTimeout(10000);

test('get default branch from a non master repo', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test_git'));
  // create a non-master using git commands
  const shell = `
    git init
    git add 'run.sh'
    git commit -m 'init commit'
    git branch -m trunk
  `;
  fs.writeFileSync(path.join(tmpDir, 'run.sh'), shell, 'utf-8');
  execSync('sh ./run.sh', {
    cwd: tmpDir,
  });

  try {
    const defaultBranch = await getDefaultBranch(tmpDir);
    expect(defaultBranch).toEqual('trunk');
  } finally {
    rimraf.sync(tmpDir);
  }
});

test('nodegit should be able to clone a repo from github.com', async () => {
  const opts: CloneOptions = {
    fetchOpts: {
      callbacks: {
        certificateCheck: () => 1,
      },
    },
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test_clone'));
  const url = 'https://github.com/Microsoft/TypeScript-Node-Starter.git';
  try {
    await Git.Clone.clone(url, tmpDir, opts);
    expect(fs.existsSync(path.join(tmpDir, '.git'))).toBeTruthy();
  } finally {
    rimraf.sync(tmpDir);
  }
});
