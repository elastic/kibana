/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { EsClient, Esqueue } from '../lib/esqueue';
import { Repository } from '../../model';
import { GitOperations } from '../git_operations';
import { Logger } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CancellationSerivce } from './cancellation_service';
import { UpdateWorker } from './update_worker';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {};
const esQueue = {};

afterEach(() => {
  sinon.restore();
});

test('Execute update job', async () => {
  // Setup RepositoryService
  const updateSpy = sinon.spy();
  const repoService = {
    update: emptyAsyncFunc,
  };
  repoService.update = updateSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelUpdateJobSpy = sinon.spy();
  const registerUpdateJobTokenSpy = sinon.spy();
  const cancellationService: any = {
    cancelUpdateJob: emptyAsyncFunc,
    registerUpdateJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;
  cancellationService.registerUpdateJobToken = registerUpdateJobTokenSpy;

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: false,
      },
    } as ServerOptions,
    {} as GitOperations,
    (repoServiceFactory as any) as RepositoryServiceFactory,
    cancellationService as CancellationSerivce
  );

  await updateWorker.executeJob({
    payload: {
      uri: 'mockrepo',
    },
    options: {},
    timestamp: 0,
  });

  expect(newInstanceSpy.calledOnce).toBeTruthy();
  expect(updateSpy.calledOnce).toBeTruthy();
});

test('On update job completed because of cancellation ', async () => {
  // Setup RepositoryService
  const updateSpy = sinon.spy();

  // Setup CancellationService
  const cancelUpdateJobSpy = sinon.spy();
  const registerUpdateJobTokenSpy = sinon.spy();
  const cancellationService: any = {
    cancelUpdateJob: emptyAsyncFunc,
    registerUpdateJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;
  cancellationService.registerUpdateJobToken = registerUpdateJobTokenSpy;

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: false,
      },
    } as ServerOptions,
    {} as GitOperations,
    {} as RepositoryServiceFactory,
    cancellationService as CancellationSerivce
  );

  await updateWorker.onJobCompleted(
    {
      payload: {
        uri: 'mockrepo',
      },
      options: {},
      timestamp: 0,
    },
    {
      uri: 'github.com/Microsoft/TypeScript-Node-Starter',
      repo: ({
        uri: 'github.com/Microsoft/TypeScript-Node-Starter',
      } as any) as Repository,
      // Update job is done because of cancellation.
      cancelled: true,
    }
  );

  // The elasticsearch update won't be called for the sake of
  // cancellation.
  expect(updateSpy.notCalled).toBeTruthy();
});
