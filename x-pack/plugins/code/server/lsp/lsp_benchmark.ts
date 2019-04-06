/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { TestConfig, RequestType } from '../../model/test_config';
import { TestRepoManager } from './test_repo_manager';
import { LspTestRunner } from './lsp_test_runner';

jest.setTimeout(300000);

let repoManger: TestRepoManager;
const resultFile = `benchmark_result_${Date.now()}.csv`;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

beforeAll(async () => {
  const config: TestConfig = yaml.safeLoad(fs.readFileSync('test_config.yml', 'utf8'));
  repoManger = new TestRepoManager(config);
  await repoManger.importAllRepos();
});

it('test Java lsp full', async () => {
  const repo = repoManger.getRepo('java');
  const runner = new LspTestRunner(repo, RequestType.FULL, 10);
  await runner.launchLspByLanguage();
  // sleep until jdt connection established
  await sleep(3000);
  await runner.sendRandomRequest();
  await runner.proxy!.exit();
  runner.dumpToCSV(resultFile);
  expect(true);
});

it('test Java lsp hover', async () => {
  const repo = repoManger.getRepo('java');
  const runner = new LspTestRunner(repo, RequestType.HOVER, 10);
  await runner.launchLspByLanguage();
  // sleep until jdt connection established
  await sleep(3000);
  await runner.sendRandomRequest();
  await runner.proxy!.exit();
  runner.dumpToCSV(resultFile);
  expect(true);
});

it('test ts lsp full', async () => {
  const repo = repoManger.getRepo('ts');
  const runner = new LspTestRunner(repo, RequestType.FULL, 10);
  await runner.launchLspByLanguage();
  await sleep(2000);
  await runner.sendRandomRequest();
  await runner.proxy!.exit();
  runner.dumpToCSV(resultFile);
  await sleep(2000);
  expect(true);
});

it('test ts lsp hover', async () => {
  const repo = repoManger.getRepo('ts');
  const runner = new LspTestRunner(repo, RequestType.HOVER, 10);
  await runner.launchLspByLanguage();
  await sleep(3000);
  await runner.sendRandomRequest();
  await runner.proxy!.exit();
  runner.dumpToCSV(resultFile);
  await sleep(2000);
  expect(true);
});

afterAll(async () => {
  // eslint-disable-next-line no-console
  console.log(`result file ${path.resolve(__dirname)}/${resultFile} was saved!`);
  await repoManger.cleanAllRepos();
});
