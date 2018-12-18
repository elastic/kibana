/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import assert from 'assert';
import fs from 'fs';
import Git, { CloneOptions } from 'nodegit';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';
import { LspIndexer } from '../indexer/lsp_indexer';
import { RepositoryGitStatusReservedField } from '../indexer/schema';
import { AnyObject, EsClient } from '../lib/esqueue';
import { Log } from '../log';
import { InstallManager } from '../lsp/install_manager';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Log = (new ConsoleLoggerFactory().getLogger(['test']) as any) as Log;

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

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
        certificateCheck: () => 1,
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

const config = {
  get(key: string) {
    if (key === 'path.data') {
      return '/tmp/test';
    }
  },
};

const serverOptions = new ServerOptions(options, config);

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
          progress: 100,
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
describe('lsp_indexer', () => {
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
      getSpy,
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
      new ConsoleLoggerFactory()
    );

    lspservice.sendRequest = setupLsServiceSendRequestSpy();

    const indexer = new LspIndexer(
      'github.com/Microsoft/TypeScript-Node-Starter',
      'master',
      lspservice,
      serverOptions,
      esClient as EsClient,
      log as Log
    );
    await indexer.start();

    // Expect EsClient get called once to get the repo git status.
    assert.ok(getSpy.calledOnce);

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
      getSpy,
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
      new ConsoleLoggerFactory()
    );

    lspservice.sendRequest = setupLsServiceSendRequestSpy();

    const indexer = new LspIndexer(
      'github.com/Microsoft/TypeScript-Node-Starter',
      'master',
      lspservice,
      serverOptions,
      esClient as EsClient,
      log as Log
    );
    // Cancel the indexer before start.
    indexer.cancel();
    await indexer.start();

    // Expect EsClient get called once to get the repo git status.
    assert.ok(getSpy.calledOnce);

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
  // @ts-ignore
}).timeout(20000);
