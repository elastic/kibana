/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable */

import fs from 'fs';
import Git from 'nodegit';
// import rimraf from 'rimraf';
import sinon from 'sinon';
import path from 'path';
import mkdirp from 'mkdirp';

import { LspService } from "../lsp/lsp_service";
import { ServerOptions } from "../server_options";
import { ConsoleLoggerFactory } from "../utils/console_logger_factory";
import { RepositoryGitStatusReservedField, RepositoryTypeName } from '../indexer/schema';
import { InstallManager } from "../lsp/install_manager";
import * as os from "os";
import assert from 'assert';




const filename = 'hello.ts';
describe('lsp_service tests', () => {
  async function prepareProject(repoPath: string) {
    mkdirp.sync(repoPath);
    const repo = await Git.Repository.init(repoPath, 0);
    const helloContent = "console.log('hello world');";
    fs.writeFileSync(path.join(repo.workdir(), filename), helloContent, 'utf8');
    const index = await repo.refreshIndex();
    await index.addByPath(filename);
    index.write();
    const treeId = await index.writeTree();
    const committer = Git.Signature.create("tester",
      "test@test.com", Date.now() / 1000, 60);
    const commit = await repo.createCommit("HEAD", committer, committer, "commit for test", treeId, []);
    console.log(`created commit ${commit.tostrS()}`);
    return repo;
  }

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

  const tmpDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
  console.log(`tmp data path is ${tmpDataPath}`);
  const config = {
    get(key: string) {
      if (key === 'path.data') {
        return tmpDataPath;
      }
    }
  };

  const serverOptions = new ServerOptions(options, config);
  const installManager = new InstallManager(serverOptions);

  function mockEsClient(): any {
    const api = {
      get: function (params: any) {
        const {type} = params;
        if (type === RepositoryTypeName) {
          return {
            _source: {
              [RepositoryGitStatusReservedField]: {
                cloneProgress: {
                  isCloned: true
                }
              }
            }
          }
        }
      },
    };
    return api;
  }

  const repoUri = 'github.com/test/test_repo';

  // @ts-ignore
  before(async () => {
    await prepareProject(
      path.join(serverOptions.repoPath, repoUri)
    );
  });


  function comparePath(pathA: string, pathB: string) {
    const pa = fs.realpathSync(pathA);
    const pb = fs.realpathSync(pathB);
    return path.resolve(pa) === path.resolve(pb);
  }

  it('process a hover request', async () => {

    let esClient = mockEsClient();
    const revision = 'master';

    const lspservice = new LspService('127.0.0.1', serverOptions, esClient, installManager, new ConsoleLoggerFactory());
    try {
      const params = {
        textDocument: {
          uri: `git://${repoUri}/blob/${revision}/${filename}`,
        },
        position: {
          line: 0,
          character: 1,
        }
      };
      const workspaceHandler = lspservice.workspaceHandler;
      const wsSpy = sinon.spy(workspaceHandler, 'handleRequest');
      const controller = lspservice.controller;
      const ctrlSpy = sinon.spy(controller, 'handleRequest');

      let method = 'textDocument/hover';

      const response = await lspservice.sendRequest(method, params);
      assert.ok(response);
      assert.ok(response.result.contents);


      wsSpy.restore();
      ctrlSpy.restore();

      const workspaceFolderExists = fs.existsSync(path.join(serverOptions.workspacePath, repoUri, revision));
      // workspace is opened
      assert.ok(workspaceFolderExists);

      const workspacePath = fs.realpathSync(path.resolve(serverOptions.workspacePath, repoUri, revision));
      // workspace handler is working, filled workspacePath
      sinon.assert.calledWith(ctrlSpy, sinon.match.has("workspacePath", sinon.match((value) => comparePath(value, workspacePath))));
      // uri is changed by workspace handler
      sinon.assert.calledWith(ctrlSpy, sinon.match.hasNested("params.textDocument.uri", `file://${workspacePath}/${filename}`));
      return;

    } finally {
      await lspservice.shutdown()
    }
    // @ts-ignore
  }).timeout(10000);

  it("unload a workspace", async () => {
    let esClient = mockEsClient();
    const revision = 'master';
    const lspservice = new LspService('127.0.0.1', serverOptions, esClient, installManager, new ConsoleLoggerFactory());
    try {
      const params = {
        textDocument: {
          uri: `git://${repoUri}/blob/${revision}/${filename}`,
        },
        position: {
          line: 0,
          character: 1,
        }
      };

      let method = 'textDocument/hover';
      // send a dummy request to open a workspace;
      const response = await lspservice.sendRequest(method, params);
      assert.ok(response);
      const workspacePath = path.resolve(serverOptions.workspacePath, repoUri, revision);
      const workspaceFolderExists = fs.existsSync(workspacePath);
      // workspace is opened
      assert.ok(workspaceFolderExists);
      const controller = lspservice.controller;
      // @ts-ignore
      const languageServer = controller.languageServerMap['typescript'];
      const realWorkspacePath = fs.realpathSync(workspacePath);

      // @ts-ignore
      const handler = languageServer.languageServerHandlers[realWorkspacePath];
      const exitSpy = sinon.spy(handler, 'exit');
      const unloadSpy = sinon.spy(handler, 'unloadWorkspace');

      await lspservice.deleteWorkspace(repoUri);

      unloadSpy.restore();
      exitSpy.restore();

      sinon.assert.calledWith(unloadSpy, realWorkspacePath);
      // typescript language server for this workspace should be closed
      sinon.assert.calledOnce(exitSpy);
      // the workspace folder should be deleted
      const exists = fs.existsSync(realWorkspacePath);
      assert.strictEqual(exists, false);
      return;
    } finally {
      await lspservice.shutdown()
    }
    // @ts-ignore
  }).timeout(10000);

});
