/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import { Clone, CloneOptions } from 'nodegit';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import { getDefaultBranch } from './git_operations';

jest.setTimeout(10000);

test('get default branch from a non master repo 2', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test_git2'));
  // create a non-master using git commands
  console.log('1');
  const shell = `
    git init
    git add 'run.sh'
    git commit -m 'init commit'
    git branch -m trunk
  `;
  fs.writeFileSync(path.join(tmpDir, 'run.sh'), shell, 'utf-8');
  console.log('2');

  execSync('sh ./run.sh', {
    cwd: tmpDir,
  });
  console.log('3');

  try {
    const defaultBranch = await getDefaultBranch(tmpDir);
    console.log('4');

    expect(defaultBranch).toEqual('trunk');
    console.log('5');
  } finally {
    rimraf.sync(tmpDir);
    console.log('6');
  }
});

test('nodegit should be able to clone a repo from github.com 2', async () => {
  const opts: CloneOptions = {
    fetchOpts: {
      callbacks: {
        certificateCheck: () => 1,
      },
    },
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test_clone2'));
  const url = 'https://github.com/Microsoft/TypeScript-Node-Starter.git';
  try {
    await Clone.clone(url, tmpDir, opts);
    expect(fs.existsSync(path.join(tmpDir, '.git'))).toBeTruthy();
  } finally {
    rimraf.sync(tmpDir);
  }
});
