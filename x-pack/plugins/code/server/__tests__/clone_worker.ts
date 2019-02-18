/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import assert from 'assert';
import fs from 'fs';
import Git from 'nodegit';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';

import { Repository } from '../../model';
import { AnyObject, EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { CloneWorker } from '../queue';
import { IndexWorker } from '../queue';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const esQueue = {};

const config = {
  get(key: string) {
    if (key === 'path.data') {
      return '/tmp/test';
    }
  },
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
  disableScheduler: true, // Temp option to disable all schedulers.
};

const serverOptions = new ServerOptions(options, config);

function prepareProject(url: string, p: string) {
  return new Promise(resolve => {
    if (!fs.existsSync(p)) {
      rimraf(p, error => {
        Git.Clone.clone(url, p).then(repo => {
          resolve(repo);
        });
      });
    } else {
      resolve();
    }
  });
}

function cleanWorkspace() {
  return new Promise(resolve => {
    rimraf(serverOptions.workspacePath, resolve);
  });
}

describe('clone_worker_tests', () => {
  // @ts-ignore
  before(async () => {
    return new Promise(resolve => {
      rimraf(serverOptions.repoPath, resolve);
    });
  });

  beforeEach(async function() {
    // @ts-ignore
    this.timeout(200000);
    await prepareProject(
      'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      path.join(serverOptions.repoPath, 'github.com/Microsoft/TypeScript-Node-Starter')
    );
  });
  // @ts-ignore
  after(() => {
    return cleanWorkspace();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Execute clone job', async () => {
    // Setup RepositoryService
    const cloneSpy = sinon.spy();
    const repoService = {
      clone: emptyAsyncFunc,
    };
    repoService.clone = cloneSpy;
    const repoServiceFactory = {
      newInstance: (): void => {
        return;
      },
    };
    const newInstanceSpy = sinon.fake.returns(repoService);
    repoServiceFactory.newInstance = newInstanceSpy;

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      {} as EsClient,
      serverOptions,
      {} as IndexWorker,
      (repoServiceFactory as any) as RepositoryServiceFactory
    );

    await cloneWorker.executeJob({
      payload: {
        url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      },
      options: {},
    });

    assert.ok(newInstanceSpy.calledOnce);
    assert.ok(cloneSpy.calledOnce);
  });

  it('On clone job completed.', async () => {
    // Setup IndexWorker
    const enqueueJobSpy = sinon.spy();
    const indexWorker = {
      enqueueJob: emptyAsyncFunc,
    };
    indexWorker.enqueueJob = enqueueJobSpy;

    // Setup EsClient
    const updateSpy = sinon.spy();
    const esClient = {
      update: emptyAsyncFunc,
    };
    esClient.update = updateSpy;

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      esClient as EsClient,
      serverOptions,
      (indexWorker as any) as IndexWorker,
      {} as RepositoryServiceFactory
    );

    await cloneWorker.onJobCompleted(
      {
        payload: {
          url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
        },
        options: {},
      },
      {
        uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        repo: ({
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        } as any) as Repository,
      }
    );

    assert.ok(enqueueJobSpy.calledOnce);
    // EsClient update got called twice. One for updating default branch and revision
    // of a repository. The other for update git clone status.
    assert.ok(updateSpy.calledTwice);
  });

  it('On clone job enqueued.', async () => {
    // Setup EsClient
    const indexSpy = sinon.spy();
    const esClient = {
      index: emptyAsyncFunc,
    };
    esClient.index = indexSpy;

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      (esClient as any) as EsClient,
      serverOptions,
      {} as IndexWorker,
      {} as RepositoryServiceFactory
    );

    await cloneWorker.onJobEnqueued({
      payload: {
        url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      },
      options: {},
    });

    // Expect EsClient index to be called to update the progress to 0.
    assert.ok(indexSpy.calledOnce);
  });
});
