/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Git, { CloneOptions } from '@elastic/nodegit';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';

import { WorkerReservedProgress } from '../../model';
import { LspIndexer } from '../indexer/lsp_indexer';
import { RepositoryGitStatusReservedField } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { InstallManager } from '../lsp/install_manager';
import { LspService } from '../lsp/lsp_service';
import { RepositoryConfigController } from '../repository_config_controller';
import { createTestServerOption, emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  bulk: emptyAsyncFunc,
  get: emptyAsyncFunc,
  deleteByQuery: emptyAsyncFunc,
  indices: {
    existsAlias: emptyAsyncFunc,
    create: emptyAsyncFunc,
    putAlias: emptyAsyncFunc,
  },
};

function prepareProject(url: string, p: string) {
  const opts: CloneOptions = {
    fetchOpts: {
      callbacks: {
        certificateCheck: () => 0,
      },
    },
  };

  return new Promise(resolve => {
    if (!fs.existsSync(p)) {
      rimraf(p, error => {
        Git.Clone.clone(url, p, opts).then(repo => {
          resolve(repo);
        });
      });
    } else {
      resolve();
    }
  });
}

const repoUri = 'github.com/Microsoft/TypeScript-Node-Starter';

const serverOptions = createTestServerOption();

function cleanWorkspace() {
  return new Promise(resolve => {
    rimraf(serverOptions.workspacePath, resolve);
  });
}

function setupEsClientSpy() {
  // Mock a git status of the repo indicating the the repo is fully cloned already.
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryGitStatusReservedField]: {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          progress: WorkerReservedProgress.COMPLETED,
          timestamp: new Date(),
          cloneProgress: {
            isCloned: true,
          },
        },
      },
    })
  );
  const existsAliasSpy = sinon.fake.returns(false);
  const createSpy = sinon.spy();
  const putAliasSpy = sinon.spy();
  const deleteByQuerySpy = sinon.spy();
  const bulkSpy = sinon.spy();
  esClient.bulk = bulkSpy;
  esClient.indices.existsAlias = existsAliasSpy;
  esClient.indices.create = createSpy;
  esClient.indices.putAlias = putAliasSpy;
  esClient.get = getSpy;
  esClient.deleteByQuery = deleteByQuerySpy;
  return {
    getSpy,
    existsAliasSpy,
    createSpy,
    putAliasSpy,
    deleteByQuerySpy,
    bulkSpy,
  };
}

function setupLsServiceSendRequestSpy(): sinon.SinonSpy {
  return sinon.fake.returns(
    Promise.resolve({
      result: [
        {
          // 1 mock symbol for each file
          symbols: [
            {
              symbolInformation: {
                name: 'mocksymbolname',
              },
            },
          ],
          // 1 mock reference for each file
          references: [{}],
        },
      ],
    })
  );
}
describe('lsp_indexer unit tests', () => {
  // @ts-ignore
  before(async () => {
    return new Promise(resolve => {
      rimraf(serverOptions.repoPath, resolve);
    });
  });

  beforeEach(async function() {
    // @ts-ignore
    this.timeout(200000);
    return await prepareProject(
      'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      path.join(serverOptions.repoPath, repoUri)
    );
  });
  // @ts-ignore
  after(() => {
    return cleanWorkspace();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Normal LSP index process.', async () => {
    // Setup the esClient spies
    const {
      existsAliasSpy,
      createSpy,
      putAliasSpy,
      deleteByQuerySpy,
      bulkSpy,
    } = setupEsClientSpy();

    const lspservice = new LspService(
      '127.0.0.1',
      serverOptions,
      esClient as EsClient,
      {} as InstallManager,
      new ConsoleLoggerFactory(),
      new RepositoryConfigController(esClient as EsClient)
    );

    lspservice.sendRequest = setupLsServiceSendRequestSpy();

    const indexer = new LspIndexer(
      'github.com/Microsoft/TypeScript-Node-Starter',
      'master',
      lspservice,
      serverOptions,
      esClient as EsClient,
      log
    );
    await indexer.start();

    // Expect EsClient deleteByQuery called 3 times for repository cleaning before
    // the index for document, symbol and reference, respectively.
    assert.strictEqual(deleteByQuerySpy.callCount, 3);

    // Ditto for index and alias creation
    assert.strictEqual(existsAliasSpy.callCount, 3);
    assert.strictEqual(createSpy.callCount, 3);
    assert.strictEqual(putAliasSpy.callCount, 3);

    // There are 22 files in the repo. 1 file + 1 symbol + 1 reference = 3 objects to
    // index for each file. Total doc indexed should be 3 * 22 = 66, which can be
    // fitted into a single batch index.
    assert.ok(bulkSpy.calledOnce);
    assert.strictEqual(bulkSpy.getCall(0).args[0].body.length, 66 * 2);
    // @ts-ignore
  }).timeout(20000);

  it('Cancel LSP index process.', async () => {
    // Setup the esClient spies
    const {
      existsAliasSpy,
      createSpy,
      putAliasSpy,
      deleteByQuerySpy,
      bulkSpy,
    } = setupEsClientSpy();

    const lspservice = new LspService(
      '127.0.0.1',
      serverOptions,
      esClient as EsClient,
      {} as InstallManager,
      new ConsoleLoggerFactory(),
      new RepositoryConfigController(esClient as EsClient)
    );

    lspservice.sendRequest = setupLsServiceSendRequestSpy();

    const indexer = new LspIndexer(
      'github.com/Microsoft/TypeScript-Node-Starter',
      'master',
      lspservice,
      serverOptions,
      esClient as EsClient,
      log
    );
    // Cancel the indexer before start.
    indexer.cancel();
    await indexer.start();

    // Expect EsClient deleteByQuery called 3 times for repository cleaning before
    // the index for document, symbol and reference, respectively.
    assert.strictEqual(deleteByQuerySpy.callCount, 3);

    // Ditto for index and alias creation
    assert.strictEqual(existsAliasSpy.callCount, 3);
    assert.strictEqual(createSpy.callCount, 3);
    assert.strictEqual(putAliasSpy.callCount, 3);

    // Because the indexer is cancelled already in the begining. 0 doc should be
    // indexed and thus bulk won't be called.
    assert.ok(bulkSpy.notCalled);
  });

  it('Index continues from a checkpoint', async () => {
    // Setup the esClient spies
    const {
      existsAliasSpy,
      createSpy,
      putAliasSpy,
      deleteByQuerySpy,
      bulkSpy,
    } = setupEsClientSpy();

    const lspservice = new LspService(
      '127.0.0.1',
      serverOptions,
      esClient as EsClient,
      {} as InstallManager,
      new ConsoleLoggerFactory(),
      new RepositoryConfigController(esClient as EsClient)
    );

    lspservice.sendRequest = setupLsServiceSendRequestSpy();

    const indexer = new LspIndexer(
      'github.com/Microsoft/TypeScript-Node-Starter',
      '46971a8',
      lspservice,
      serverOptions,
      esClient as EsClient,
      log
    );

    // Apply a checkpoint in here.
    await indexer.start(undefined, {
      repoUri: '',
      filePath: 'src/public/js/main.ts',
      revision: '46971a8',
      localRepoPath: '',
    });

    // Expect EsClient deleteByQuery called 0 times for repository cleaning while
    // dealing with repository checkpoint.
    assert.strictEqual(deleteByQuerySpy.callCount, 0);

    // Ditto for index and alias creation
    assert.strictEqual(existsAliasSpy.callCount, 0);
    assert.strictEqual(createSpy.callCount, 0);
    assert.strictEqual(putAliasSpy.callCount, 0);

    // There are 22 files in the repo, but only 11 files after the checkpoint.
    // 1 file + 1 symbol + 1 reference = 3 objects to index for each file.
    // Total doc indexed should be 3 * 11 = 33, which can be fitted into a
    // single batch index.
    assert.ok(bulkSpy.calledOnce);
    assert.strictEqual(bulkSpy.getCall(0).args[0].body.length, 33 * 2);
    // @ts-ignore
  }).timeout(20000);
  // @ts-ignore
}).timeout(20000);
