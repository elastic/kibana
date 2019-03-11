/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as sinon from 'sinon';
import { KbnServer } from '../../types';
import { createWorkerFactory } from './create_worker';
// @ts-ignore
import { Esqueue } from './esqueue';
// @ts-ignore
import { ClientMock } from './esqueue/__tests__/fixtures/elasticsearch';

const configGetStub = sinon.stub();
configGetStub.withArgs('xpack.reporting.queue').returns({
  pollInterval: 3300,
  pollIntervalErrorMultiplier: 10,
});
configGetStub.withArgs('server.name').returns('test-server-123');
configGetStub.withArgs('server.uuid').returns('g9ymiujthvy6v8yrh7567g6fwzgzftzfr');

describe('Create Worker', () => {
  let queue: Esqueue;
  let client: ClientMock;
  const executeJobFactoryStub = sinon.stub();

  const getMockServer = (): Partial<KbnServer> => ({
    log: sinon.stub(),
    expose: sinon.stub(),
    config: () => ({ get: configGetStub }),
    plugins: {
      reporting: {
        exportTypesRegistry: {
          getAll: () => {
            return [{ executeJobFactory: executeJobFactoryStub }];
          },
        },
      },
    },
  });

  beforeEach(() => {
    client = new ClientMock();
    queue = new Esqueue('reporting-queue', { client });
    executeJobFactoryStub.reset();
  });

  test('Creates a single Esqueue worker for Reporting', async () => {
    const createWorker = createWorkerFactory(getMockServer());
    const registerWorkerSpy = sinon.spy(queue, 'registerWorker');
    createWorker(queue);
    sinon.assert.calledOnce(registerWorkerSpy);
    sinon.assert.calledOnce(executeJobFactoryStub);
  });
});
