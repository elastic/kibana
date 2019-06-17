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
import { AbstractLauncher, ServerStartFailed } from './abstract_launcher';
import { RequestExpander } from './request_expander';
import { LanguageServerProxy } from './proxy';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { Logger } from '../log';
import getPort from 'get-port';

jest.setTimeout(40000);

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

  protected maxRespawn = 3;

  createExpander(
    proxy: LanguageServerProxy,
    builtinWorkspace: boolean,
    maxWorkspace: number
  ): RequestExpander {
    return new RequestExpander(proxy, builtinWorkspace, maxWorkspace, this.options);
  }

  async getPort() {
    return await getPort();
  }

  async spawnProcess(installationPath: string, port: number, log: Logger): Promise<ChildProcess> {
    const childProcess = fork(path.join(__dirname, 'mock_lang_server.js'));
    this.childProcess = childProcess;
    childProcess.on('message', msg => {
      // eslint-disable-next-line no-console
      console.log(msg);
      mockMonitor(msg);
    });
    childProcess.send(`port ${port}`);
    childProcess.send(`host ${this.targetHost}`);
    childProcess.send('listen');
    return childProcess;
  }

  protected killProcess(child: ChildProcess): Promise<boolean> {
    // don't kill the process so fast, otherwise no normal exit can happen
    return new Promise<boolean>(resolve => {
      setTimeout(async () => {
        const killed = await super.killProcess(child);
        resolve(killed);
      }, 100);
    });
  }
}

class PassiveMockLauncher extends MockLauncher {
  constructor(
    name: string,
    targetHost: string,
    opt: ServerOptions,
    private dieBeforeStart: number = 0
  ) {
    super(name, targetHost, opt);
  }

  startConnect(proxy: LanguageServerProxy) {
    proxy.awaitServerConnection().catch(this.log.debug);
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
    this.childProcess.send(`port ${port}`);
    this.childProcess.send(`host ${this.targetHost}`);
    if (this.dieBeforeStart > 0) {
      this.childProcess!.send('quit');
      this.dieBeforeStart -= 1;
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

async function retryUtil(millis: number, testFn: () => void, interval = 1000) {
  try {
    testFn();
  } catch (e) {
    if (millis >= 0) {
      await delay(interval);
      await retryUtil(millis - interval, testFn);
    } else {
      throw e;
    }
  }
}

// FLAKY: https://github.com/elastic/kibana/issues/38791
test.skip('launcher can start and end a process', async () => {
  const launcher = new MockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await retryUtil(1000, () => {
    expect(mockMonitor.mock.calls[0][0]).toBe('process started');
    expect(mockMonitor.mock.calls[1][0]).toBe('start listening');
    expect(mockMonitor.mock.calls[2][0]).toBe('socket connected');
  });
  await proxy.exit();
  await retryUtil(1000, () => {
    expect(mockMonitor.mock.calls[3][0]).toMatchObject({ method: 'shutdown' });
    expect(mockMonitor.mock.calls[4][0]).toMatchObject({ method: 'exit' });
    expect(mockMonitor.mock.calls[5][0]).toBe('exit process with code 0');
  });
});

test('launcher can force kill the process if langServer can not exit', async () => {
  const launcher = new MockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await delay(100);
  // set mock lang server to noExist mode
  launcher.childProcess!.send('noExit');
  mockMonitor.mockClear();
  await proxy.exit();
  await retryUtil(30000, () => {
    expect(mockMonitor.mock.calls[0][0]).toMatchObject({ method: 'shutdown' });
    expect(mockMonitor.mock.calls[1][0]).toMatchObject({ method: 'exit' });
    expect(mockMonitor.mock.calls[2][0]).toBe('noExit');
    expect(launcher.childProcess!.killed).toBe(true);
  });
});

test('launcher can reconnect if process died', async () => {
  const launcher = new MockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await delay(1000);
  mockMonitor.mockClear();
  // let the process quit
  launcher.childProcess!.send('quit');
  await retryUtil(30000, () => {
    // launcher should respawn a new process and connect
    expect(mockMonitor.mock.calls[0][0]).toBe('process started');
    expect(mockMonitor.mock.calls[1][0]).toBe('start listening');
    expect(mockMonitor.mock.calls[2][0]).toBe('socket connected');
  });
  await proxy.exit();
  await delay(1000);
});

// FLAKY: https://github.com/elastic/kibana/issues/38849
test.skip('passive launcher can start and end a process', async () => {
  const launcher = new PassiveMockLauncher('mock', 'localhost', options);
  const proxy = await launcher.launch(false, 1, '');
  await retryUtil(30000, () => {
    expect(mockMonitor.mock.calls[0][0]).toBe('process started');
    expect(mockMonitor.mock.calls[1][0]).toBe('start connecting');
    expect(mockMonitor.mock.calls[2][0]).toBe('socket connected');
  });
  await proxy.exit();
  await retryUtil(30000, () => {
    expect(mockMonitor.mock.calls[3][0]).toMatchObject({ method: 'shutdown' });
    expect(mockMonitor.mock.calls[4][0]).toMatchObject({ method: 'exit' });
    expect(mockMonitor.mock.calls[5][0]).toBe('exit process with code 0');
  });
});

test('passive launcher should restart a process if a process died before connected', async () => {
  const launcher = new PassiveMockLauncher('mock', 'localhost', options, 1);
  const proxy = await launcher.launch(false, 1, '');
  await delay(100);
  await retryUtil(30000, () => {
    expect(mockMonitor.mock.calls[0][0]).toBe('process started');
    expect(mockMonitor.mock.calls[1][0]).toBe('process started');
    expect(mockMonitor.mock.calls[2][0]).toBe('start connecting');
    expect(mockMonitor.mock.calls[3][0]).toBe('socket connected');
  });
  await proxy.exit();
  await delay(1000);
});

test('launcher should mark proxy unusable after restart 2 times', async () => {
  const launcher = new PassiveMockLauncher('mock', 'localhost', options, 3);
  try {
    await launcher.launch(false, 1, '');
  } catch (e) {
    await retryUtil(30000, () => {
      expect(mockMonitor.mock.calls[0][0]).toBe('process started');
      // restart 2 times
      expect(mockMonitor.mock.calls[1][0]).toBe('process started');
      expect(mockMonitor.mock.calls[2][0]).toBe('process started');
    });
    expect(e).toEqual(ServerStartFailed);
    await delay(1000);
  }
});
