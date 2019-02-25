/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { WorkerReservedProgress } from '../../model';
import { IndexerFactory } from '../indexer';
import { AnyObject, CancellationToken, EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CancellationSerivce } from './cancellation_service';
import { IndexWorker } from './index_worker';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const esQueue = {};

afterEach(() => {
  sinon.restore();
});

test('Execute index job.', async () => {
  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const registerIndexJobTokenSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
    registerIndexJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.registerIndexJobToken = registerIndexJobTokenSpy;

  // Setup IndexerFactory
  const cancelSpy = sinon.spy();
  const startSpy = sinon.fake.returns(new Map());
  const indexer = {
    cancel: emptyAsyncFunc,
    start: emptyAsyncFunc,
  };
  indexer.cancel = cancelSpy;
  indexer.start = startSpy;
  const createSpy = sinon.fake.returns(indexer);
  const indexerFactory = {
    create: emptyAsyncFunc,
  };
  indexerFactory.create = createSpy;

  const cToken = new CancellationToken();

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    {} as EsClient,
    [(indexerFactory as any) as IndexerFactory],
    (cancellationService as any) as CancellationSerivce
  );

  await indexWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    cancellationToken: cToken,
    timestamp: 0,
  });

  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();

  expect(createSpy.calledOnce).toBeTruthy();
  expect(startSpy.calledOnce).toBeTruthy();
  expect(cancelSpy.notCalled).toBeTruthy();
});

test('Execute index job and then cancel.', async () => {
  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const registerIndexJobTokenSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
    registerIndexJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.registerIndexJobToken = registerIndexJobTokenSpy;

  // Setup IndexerFactory
  const cancelSpy = sinon.spy();
  const startSpy = sinon.fake.returns(new Map());
  const indexer = {
    cancel: emptyAsyncFunc,
    start: emptyAsyncFunc,
  };
  indexer.cancel = cancelSpy;
  indexer.start = startSpy;
  const createSpy = sinon.fake.returns(indexer);
  const indexerFactory = {
    create: emptyAsyncFunc,
  };
  indexerFactory.create = createSpy;

  const cToken = new CancellationToken();

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    {} as EsClient,
    [(indexerFactory as any) as IndexerFactory],
    (cancellationService as any) as CancellationSerivce
  );

  await indexWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    cancellationToken: cToken,
    timestamp: 0,
  });

  // Cancel the index job.
  cToken.cancel();

  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();

  expect(createSpy.calledOnce).toBeTruthy();
  expect(startSpy.calledOnce).toBeTruthy();
  // Then the the cancel function of the indexer should be called.
  expect(cancelSpy.calledOnce).toBeTruthy();
});

test('On index job enqueued.', async () => {
  // Setup EsClient
  const indexSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    index: emptyAsyncFunc,
  };
  esClient.index = indexSpy;

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [],
    {} as CancellationSerivce
  );

  await indexWorker.onJobEnqueued({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    timestamp: 0,
  });

  expect(indexSpy.calledOnce).toBeTruthy();
});

test('On index job completed.', async () => {
  // Setup EsClient
  const updateSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    update: emptyAsyncFunc,
  };
  esClient.update = updateSpy;

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [],
    {} as CancellationSerivce
  );

  await indexWorker.onJobCompleted(
    {
      payload: {
        uri: 'github.com/elastic/kibana',
      },
      options: {},
      timestamp: 0,
    },
    {
      uri: 'github.com/elastic/kibana',
      progress: WorkerReservedProgress.COMPLETED,
      timestamp: new Date(),
    }
  );

  expect(updateSpy.calledOnce).toBeTruthy();
});
