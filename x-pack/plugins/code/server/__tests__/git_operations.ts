/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable */
import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import {getDefaultBranch, GitOperations} from '../git_operations';
import {ServerOptions} from "../server_options";
import * as mkdirp from "mkdirp";
import Git from 'nodegit';

describe('git_operations', () => {
  it('get default branch from a non master repo', async () => {
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
      assert.strictEqual(defaultBranch, 'trunk');
    } finally {
      rimraf.sync(tmpDir);
    }
    return '';
  });

  async function prepareProject(repoPath: string) {
    mkdirp.sync(repoPath);
    const repo = await Git.Repository.init(repoPath, 0);
    const content = "";
    fs.writeFileSync(path.join(repo.workdir(), "1"), content, 'utf8');
    const subFolder = 'src';
    fs.mkdirSync(path.join(repo.workdir(), subFolder));
    fs.writeFileSync(path.join(repo.workdir(), "src/2"), content, 'utf8');
    fs.writeFileSync(path.join(repo.workdir(), "src/3"), content, 'utf8');

    const index = await repo.refreshIndex();
    await index.addByPath("1");
    await index.addByPath("src/2");
    await index.addByPath("src/3");
    index.write();
    const treeId = await index.writeTree();
    const committer = Git.Signature.create("tester",
      "test@test.com", Date.now() / 1000, 60);
    const commit = await repo.createCommit("HEAD", committer, committer, "commit for test", treeId, []);
    console.log(`created commit ${commit.tostrS()}`);
    return repo;
  }

  // @ts-ignore
  before(async () => {
    await prepareProject(
      path.join(serverOptions.repoPath, repoUri)
    );
  });
  const repoUri = 'github.com/test/test_repo';
  const tmpDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
  const config = {
    get(key: string) {
      if (key === 'path.data') {
        return tmpDataPath;
      }
    }
  };
  const options = {
    enabled: true,
    queueIndex: '.code-worker-queue',
    queueTimeout: 60 * 60 * 1000, // 1 hour by default
    updateFreqencyMs: 5 * 60 * 1000, // 5 minutes by default
    indexFrequencyMs: 24 * 60 * 60 * 1000, // 1 day by default
    lspRequestTimeoutMs: 5 * 60, // timeout a request over 30s
    repos: [],
    maxWorkspace: 5, // max workspace folder for each language server
    isAdmin: true, // If we show the admin buttons
    disableScheduler: true, // Temp option to disable all schedulers.
  };
  const serverOptions = new ServerOptions(options, config);

  it('can iterate a repo', async () => {
    const g = new GitOperations(serverOptions.repoPath);
    let count = 0;
    const iterator = await g.iterateRepo(repoUri, 'HEAD');
    for await (let value of iterator) {
      if(count=== 0) {
        assert.strictEqual("1", value.name);
        assert.strictEqual("1",value.path)
      } else if(count=== 1) {
        assert.strictEqual("2", value.name);
        assert.strictEqual("src/2",value.path)
      } else if(count=== 2) {
        assert.strictEqual("3", value.name);
        assert.strictEqual("src/3",value.path)
      } else {
        assert.fail("this repo should contains exactly 2 files")
      }
      count++;
    }
    const totalFiles = await g.countRepoFiles(repoUri, 'HEAD');
    assert.strictEqual(count, 3, "this repo should contains exactly 2 files");
    assert.strictEqual(totalFiles, 3, "this repo should contains exactly 2 files");
  })
});


