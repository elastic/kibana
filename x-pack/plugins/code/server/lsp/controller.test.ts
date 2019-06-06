/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import mkdirp from 'mkdirp';
import * as os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';
import { LanguageServerStatus } from '../../common/language_server';
import { LspRequest } from '../../model';
import { RepositoryConfigController } from '../repository_config_controller';
import { ServerOptions } from '../server_options';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { LanguageServerController } from './controller';
import { InstallManager } from './install_manager';
import { ILanguageServerLauncher } from './language_server_launcher';
import { JAVA, LanguageServerDefinition, TYPESCRIPT } from './language_servers';
import { ILanguageServerHandler } from './proxy';

const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
const workspaceDir = path.join(baseDir, 'workspace');

// @ts-ignore
const options: ServerOptions = sinon.createStubInstance(ServerOptions);
// @ts-ignore
options.lsp = { detach: false };
// @ts-ignore
options.maxWorkspace = 2;

const installManager = sinon.createStubInstance(InstallManager);
// @ts-ignore
installManager.status = (def: LanguageServerDefinition) => {
  return LanguageServerStatus.READY;
};

const repoConfigController = sinon.createStubInstance(RepositoryConfigController);
// @ts-ignore
repoConfigController.isLanguageDisabled = (uri: string, lang: string) => {
  return Promise.resolve(false);
};

const launcherSpy = sinon.stub();

class LauncherStub implements ILanguageServerLauncher {
  public get running(): boolean {
    return launcherSpy.called;
  }

  public launch(
    builtinWorkspace: boolean,
    maxWorkspace: number,
    installationPath?: string
  ): Promise<ILanguageServerHandler> {
    return Promise.resolve(launcherSpy(builtinWorkspace, maxWorkspace, installationPath));
  }
}

TYPESCRIPT.launcher = LauncherStub;
JAVA.launcher = LauncherStub;

let controller: typeof LanguageServerController;

beforeAll(() => {
  mkdirp.sync(workspaceDir);
});
beforeEach(async () => {
  sinon.reset();
  const handler: ILanguageServerHandler = {
    handleRequest(request: LspRequest): any {
      return {};
    },
    exit(): any {
      return {};
    },
    unloadWorkspace(_: string): any {
      return {};
    },
  };
  launcherSpy.returns(handler);
  controller = new LanguageServerController(
    options,
    '127.0.0.1',
    // @ts-ignore
    installManager,
    new ConsoleLoggerFactory(),
    // @ts-ignore
    repoConfigController
  );
});
afterAll(() => {
  rimraf.sync(baseDir);
});

function mockRequest(repo: string, file: string) {
  const repoPath = path.join(workspaceDir, repo);
  mkdirp.sync(repoPath);
  return {
    method: 'request',
    params: [],
    workspacePath: repoPath,
    timeoutForInitializeMs: 100,
    resolvedFilePath: path.join(repoPath, file),
  };
}

test('controller should launch a lang server', async () => {
  const request = mockRequest('repo1', 'test.ts');
  // @ts-ignore
  await controller.handleRequest(request);
  expect(launcherSpy.calledOnce).toBeTruthy();
});

test('java-lang-server support should only be launched exactly once', async () => {
  const request1 = mockRequest('repo1', 'Test.java');
  const request2 = mockRequest('repo2', 'Test.java');
  // @ts-ignore
  const p1 = controller.handleRequest(request1);
  // @ts-ignore
  const p2 = controller.handleRequest(request2);
  await Promise.all([p1, p2]);
  expect(launcherSpy.calledOnce).toBeTruthy();
});

test('should launch 2 ts-lang-server for different repo', async () => {
  const request1 = mockRequest('repo1', 'test.ts');
  const request2 = mockRequest('repo2', 'test.ts');
  // @ts-ignore
  const p1 = controller.handleRequest(request1);
  // @ts-ignore
  const p2 = controller.handleRequest(request2);
  await Promise.all([p1, p2]);
  expect(launcherSpy.calledTwice).toBeTruthy();
});

test('should only exactly 1 ts-lang-server for the same repo', async () => {
  const request1 = mockRequest('repo1', 'test.ts');
  const request2 = mockRequest('repo1', 'test.ts');
  // @ts-ignore
  const p1 = controller.handleRequest(request1);
  // @ts-ignore
  const p2 = controller.handleRequest(request2);
  await Promise.all([p1, p2]);
  expect(launcherSpy.calledOnce).toBeTruthy();
  expect(launcherSpy.calledTwice).toBe(false);
});
