/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Git from '@elastic/nodegit';
import assert from 'assert';
import { delay } from 'bluebird';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';

import { Repository } from '../../model';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { CloneWorker } from '../queue';
import { IndexWorker } from '../queue';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { createTestServerOption, emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esQueue = {};

const serverOptions = createTestServerOption();

function prepareProject(url: string, p: string) {
  return new Promise(resolve => {
    if (!fs.existsSync(p)) {
      rimraf(p, error => {
        Git.Clone.clone(url, p, {
          fetchOpts: {
            callbacks: {
              certificateCheck: () => 0,
            },
          },
        }).then(repo => {
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
      timestamp: 0,
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
        timestamp: 0,
      },
      {
        uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        repo: ({
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        } as any) as Repository,
      }
    );

    // EsClient update got called 3 times:
    // * update default branch and revision of a repository object
    // * update the revision in the git clone status
    // * update the clone progress
    assert.ok(updateSpy.calledThrice);

    // Index request is issued after a 1s delay.
    await delay(1000);
    assert.ok(enqueueJobSpy.calledOnce);
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
      timestamp: 0,
    });

    // Expect EsClient index to be called to update the progress to 0.
    assert.ok(indexSpy.calledOnce);
  });

  it('Skip clone job for invalid git url', async () => {
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

    const result1 = await cloneWorker.executeJob({
      payload: {
        url: 'file:///foo/bar.git',
      },
      options: {},
      timestamp: 0,
    });

    assert.ok(result1.repo === null);
    assert.ok(newInstanceSpy.notCalled);
    assert.ok(cloneSpy.notCalled);

    const result2 = await cloneWorker.executeJob({
      payload: {
        url: '/foo/bar.git',
      },
      options: {},
      timestamp: 0,
    });

    assert.ok(result2.repo === null);
    assert.ok(newInstanceSpy.notCalled);
    assert.ok(cloneSpy.notCalled);
  });
});
