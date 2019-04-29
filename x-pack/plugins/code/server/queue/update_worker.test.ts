/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
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

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: false,
      },
    } as ServerOptions,
    (repoServiceFactory as any) as RepositoryServiceFactory
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
