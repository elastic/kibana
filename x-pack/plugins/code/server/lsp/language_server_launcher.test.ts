/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import rimraf from 'rimraf';
import { TEST_OPTIONS } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { TYPESCRIPT } from './language_servers';
import { TypescriptServerLauncher } from './ts_launcher';

jest.setTimeout(10000);
const tmpDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));

// @ts-ignore
const options: ServerOptions = {
  workspacePath: `${tmpDataPath}/workspace`,
  jdtWorkspacePath: `${tmpDataPath}/jdt`,
  lsp: TEST_OPTIONS.lsp,
  security: TEST_OPTIONS.security,
};

beforeAll(async () => {
  if (!fs.existsSync(options.workspacePath)) {
    fs.mkdirSync(options.workspacePath);
    fs.mkdirSync(options.jdtWorkspacePath);
  }
});

afterAll(() => {
  rimraf.sync(tmpDataPath);
});

function delay(seconds: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), seconds * 1000);
  });
}

test('typescript language server could be shutdown', async () => {
  const tsLauncher = new TypescriptServerLauncher('localhost', options, new ConsoleLoggerFactory());
  const proxy = await tsLauncher.launch(true, 1, TYPESCRIPT.embedPath!);
  await proxy.initialize(options.workspacePath);
  await delay(2);
  expect(tsLauncher.running).toBeTruthy();
  await proxy.exit();
  await delay(2);
  expect(tsLauncher.running).toBeFalsy();
});
