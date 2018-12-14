/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import sinon from 'sinon';

import { CloneProgress, CloneWorkerProgress, Repository } from '../../model';
import { RepositoryGitStatusReservedField, RepositoryReservedField } from '../indexer/schema';
import { AnyObject, EsClient } from '../lib/esqueue';
import { Log } from '../log';
import { UpdateWorker } from '../queue/update_worker';
import { ServerOptions } from '../server_options';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { UpdateScheduler } from './update_scheduler';

const UPDATE_FREQUENCY_MS: number = 1000;
const UPDATE_REPO_FREQUENCY_MS: number = 8000;
const serverOpts = {
  updateFrequencyMs: UPDATE_FREQUENCY_MS,
  updateRepoFrequencyMs: UPDATE_REPO_FREQUENCY_MS,
};
const log: Log = (new ConsoleLoggerFactory().getLogger(['test']) as any) as Log;

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const esClient = {
  get: emptyAsyncFunc,
  search: emptyAsyncFunc,
  update: emptyAsyncFunc,
};
const updateWorker = {
  enqueueJob: emptyAsyncFunc,
};

const createSearchSpy = (nextUpdateTimestamp: number): sinon.SinonSpy => {
  const repo: Repository = {
    uri: 'github.com/elastic/code',
    url: 'https://github.com/elastic/code.git',
    org: 'elastic',
    name: 'code',
    nextUpdateTimestamp: moment()
      .add(nextUpdateTimestamp, 'ms')
      .toDate(),
  };
  return sinon.fake.returns(
    Promise.resolve({
      hits: {
        hits: [
          {
            _source: {
              [RepositoryReservedField]: repo,
            },
          },
        ],
      },
    })
  );
};

const createGetSpy = (progress: number): sinon.SinonSpy => {
  const cloneStatus: CloneWorkerProgress = {
    uri: 'github.com/elastic/code',
    progress,
    timestamp: new Date(),
    cloneProgress: {
      isCloned: true,
    } as CloneProgress,
  };
  return sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryGitStatusReservedField]: cloneStatus,
      },
    })
  );
};

afterEach(() => {
  sinon.restore();
});

test('Next job should not execute when scheduled update time is not current.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the UpdateWorker spy.
  const enqueueJobSpy = sinon.spy(updateWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(UPDATE_FREQUENCY_MS + 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getSpy = createGetSpy(100);
  esClient.get = getSpy;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      // Expect no update on anything regarding the update task scheduling.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      expect(getSpy.notCalled).toBeTruthy();
      expect(updateSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const updateScheduler = new UpdateScheduler(
    (updateWorker as any) as UpdateWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log as Log,
    onScheduleFinished
  );
  updateScheduler.start();

  // Roll the clock to the time when the first scheduled update task
  // is executed.
  clock.tick(UPDATE_FREQUENCY_MS);
});

test('Next job should not execute when repo is still in clone.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the UpdateWorker spy.
  const enqueueJobSpy = sinon.spy(updateWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(UPDATE_FREQUENCY_MS - 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getSpy = createGetSpy(50);
  esClient.get = getSpy;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories and
      // the get stub to be called to pull out git status.
      expect(searchSpy.calledOnce).toBeTruthy();
      expect(getSpy.calledOnce).toBeTruthy();
      // Expect no update on anything regarding the update task scheduling.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      expect(updateSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const updateScheduler = new UpdateScheduler(
    (updateWorker as any) as UpdateWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log as Log,
    onScheduleFinished
  );
  updateScheduler.start();

  // Roll the clock to the time when the first scheduled update task
  // is executed.
  clock.tick(UPDATE_FREQUENCY_MS);
});

test('Next job should execute.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the UpdateWorker spy.
  const enqueueJobSpy = sinon.stub(updateWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(UPDATE_FREQUENCY_MS - 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getSpy = createGetSpy(100);
  esClient.get = getSpy;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      // Expect the get stub to be called to pull git status.
      expect(getSpy.calledOnce).toBeTruthy();
      // Expect the update stub to be called to update next schedule timestamp.
      expect(updateSpy.calledOnce).toBeTruthy();
      // Expect the enqueue job stub to be called to issue the update job.
      expect(enqueueJobSpy.calledOnce).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const updateScheduler = new UpdateScheduler(
    (updateWorker as any) as UpdateWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log as Log,
    onScheduleFinished
  );
  updateScheduler.start();

  // Roll the clock to the time when the first scheduled update task
  // is executed.
  clock.tick(UPDATE_FREQUENCY_MS);
});
