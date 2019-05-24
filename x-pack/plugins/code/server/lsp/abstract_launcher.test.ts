/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line max-classes-per-file
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

import { ServerOptions } from '../server_options';
import { createTestServerOption } from '../test_utils';
import { AbstractLauncher } from './abstract_launcher';
import { RequestExpander } from './request_expander';
import { LanguageServerProxy } from './proxy';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { Logger } from '../log';

jest.setTimeout(10000);

// @ts-ignore
const options: ServerOptions = createTestServerOption();

// a mock function being called when then forked sub process status changes
// @ts-ignore
const mockMonitor = jest.fn();

class MockLauncher extends AbstractLauncher {
  public childProcess?: ChildProcess;

  constructor(name: string, targetHost: string, opt: ServerOptions) {
    super(name, targetHost, opt, new ConsoleLoggerFactory());
  }

  createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander {
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options);
  }

  async getPort() {
    return 19999;
  }

  async spawnProcess(installationPath: string, port: number, log: Logger): Promise<ChildProcess> {
    const childProcess = fork(path.join(__dirname, 'mock_lang_server.js'));
    this.childProcess = childProcess;
    childProcess.on('message', msg => {
      // eslint-disable-next-line no-console
      console.log(msg);
      mockMonitor(msg);
    });
    childProcess.send(`port ${await this.getPort()}`);
    childProcess.send(`host ${this.targetHost}`);
    childProcess.send('listen');
    return childProcess;
  }
}

class PassiveMockLauncher extends MockLauncher {
  constructor(
    name: string,
    targetHost: string,
    opt: ServerOptions,
    private dieFirstTime: boolean = false
  ) {
    super(name, targetHost, opt);
  }

  startConnect(proxy: LanguageServerProxy) {
    proxy.awaitServerConnection();
  }

  async getPort() {
    return 19998;
  }

  async spawnProcess(installationPath: string, port: number, log: Logger): Promise<ChildProcess> {
    this.childProcess = fork(path.join(__dirname, 'mock_lang_server.js'));
    this.childProcess.on('message', msg => {
      // eslint-disable-next-line no-console
      console.log(msg);
      mockMonitor(msg);
    });
    this.childProcess.send(`port ${await this.getPort()}`);
    this.childProcess.send(`host ${this.targetHost}`);
    if (this.dieFirstTime) {
      this.childProcess!.send('quit');
      this.dieFirstTime = false;
    } else {
      this.childProcess!.send('connect');
    }
    return this.childProcess!;
  }
}

beforeAll(async () => {
  if (!fs.existsSync(options.workspacePath)) {
    fs.mkdirSync(options.workspacePath, { recursive: true });
    fs.mkdirSync(options.jdtWorkspacePath, { recursive: true });
  }
});

beforeEach(() => {
  mockMonitor.mockClear();
});

function delay(millis: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), millis);
  });
}

test('launcher can start and end a process', async () => {
  const launcher = new MockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await delay(100);
  expect(mockMonitor.mock.calls[0][0]).toBe('process started');
  expect(mockMonitor.mock.calls[1][0]).toBe('start listening');
  expect(mockMonitor.mock.calls[2][0]).toBe('socket connected');
  await proxy.exit();
  await delay(100);
  expect(mockMonitor.mock.calls[3][0]).toMatchObject({ method: 'shutdown' });
  expect(mockMonitor.mock.calls[4][0]).toMatchObject({ method: 'exit' });
  expect(mockMonitor.mock.calls[5][0]).toBe('exit process with code 0');
});

test('launcher can force kill the process if langServer can not exit', async () => {
  const launcher = new MockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await delay(100);
  // set mock lang server to noExist mode
  launcher.childProcess!.send('noExit');
  mockMonitor.mockClear();
  await proxy.exit();
  await delay(2000);
  expect(mockMonitor.mock.calls[0][0]).toMatchObject({ method: 'shutdown' });
  expect(mockMonitor.mock.calls[1][0]).toMatchObject({ method: 'exit' });
  expect(mockMonitor.mock.calls[2][0]).toBe('noExit');
  expect(launcher.childProcess!.killed).toBe(true);
});

test('launcher can reconnect if process died', async () => {
  const launcher = new MockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await delay(1000);
  mockMonitor.mockClear();
  // let the process quit
  launcher.childProcess!.send('quit');
  await delay(5000);
  // launcher should respawn a new process and connect
  expect(mockMonitor.mock.calls[0][0]).toBe('process started');
  expect(mockMonitor.mock.calls[1][0]).toBe('start listening');
  expect(mockMonitor.mock.calls[2][0]).toBe('socket connected');
  await proxy.exit();
  await delay(2000);
});

test('passive launcher can start and end a process', async () => {
  const launcher = new PassiveMockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await delay(100);
  expect(mockMonitor.mock.calls[0][0]).toBe('process started');
  expect(mockMonitor.mock.calls[1][0]).toBe('start connecting');
  expect(mockMonitor.mock.calls[2][0]).toBe('socket connected');
  await proxy.exit();
  await delay(100);
  expect(mockMonitor.mock.calls[3][0]).toMatchObject({ method: 'shutdown' });
  expect(mockMonitor.mock.calls[4][0]).toMatchObject({ method: 'exit' });
  expect(mockMonitor.mock.calls[5][0]).toBe('exit process with code 0');
});

test('passive launcher should restart a process if a process died before connected', async () => {
  const launcher = new PassiveMockLauncher('mock', 'localhost', options, true);
  const proxy = await launcher.launch(false, 1, '');
  await delay(100);
  expect(mockMonitor.mock.calls[0][0]).toBe('process started');
  expect(mockMonitor.mock.calls[1][0]).toBe('process started');
  expect(mockMonitor.mock.calls[2][0]).toBe('start connecting');
  expect(mockMonitor.mock.calls[3][0]).toBe('socket connected');
  await proxy.exit();
  await delay(1000);
});
