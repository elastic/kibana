/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { TaskPoller } from './task_poller';
import { TaskStore } from './task_store';
import { mockLogger, resolvable, sleep } from './test_utils';

let store: TaskStore;

describe('TaskPoller', () => {
  beforeEach(() => {
    const callCluster = sinon.spy();
    store = new TaskStore({
      callCluster,
      index: 'tasky',
      maxAttempts: 2,
      supportedTypes: ['a', 'b', 'c'],
    });
  });

  describe('interval tests', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    test('runs the work function on an interval', async () => {
      const pollInterval = _.random(10, 20);
      const done = resolvable();
      const work = sinon.spy(() => {
        done.resolve();
        return Promise.resolve();
      });
      const poller = new TaskPoller({
        store,
        pollInterval,
        work,
        logger: mockLogger(),
      });

      await poller.start();

      sinon.assert.calledOnce(work);
      await done;

      clock.tick(pollInterval - 1);
      sinon.assert.calledOnce(work);
      clock.tick(1);
      sinon.assert.calledTwice(work);
    });
  });

  test('logs, but does not crash if the work function fails', async () => {
    let count = 0;
    const logger = mockLogger();
    const doneWorking = resolvable();
    const poller = new TaskPoller({
      store,
      logger,
      pollInterval: 1,
      work: async () => {
        ++count;
        if (count === 1) {
          throw new Error('Dang it!');
        }
        if (count > 1) {
          poller.stop();
          doneWorking.resolve();
        }
      },
    });

    poller.start();

    await doneWorking;

    expect(count).toEqual(2);
    sinon.assert.calledWithMatch(logger.error, /Dang it/i);
  });

  test('is stoppable', async () => {
    const doneWorking = resolvable();
    const work = sinon.spy(async () => {
      poller.stop();
      doneWorking.resolve();
    });

    const poller = new TaskPoller({
      store,
      logger: mockLogger(),
      pollInterval: 1,
      work,
    });

    poller.start();
    await doneWorking;
    await sleep(10);

    sinon.assert.calledOnce(work);
  });

  test('disregards duplicate calls to "start"', async () => {
    const doneWorking = resolvable();
    const work = sinon.spy(async () => {
      await doneWorking;
    });
    const poller = new TaskPoller({
      store,
      pollInterval: 1,
      logger: mockLogger(),
      work,
    });

    await poller.start();
    poller.start();
    poller.start();
    poller.start();

    poller.stop();

    doneWorking.resolve();

    sinon.assert.calledOnce(work);
  });

  test('waits for work before polling', async () => {
    const doneWorking = resolvable();
    const work = sinon.spy(async () => {
      await sleep(10);
      poller.stop();
      doneWorking.resolve();
    });
    const poller = new TaskPoller({
      store,
      pollInterval: 1,
      logger: mockLogger(),
      work,
    });

    poller.start();
    await doneWorking;

    sinon.assert.calledOnce(work);
  });

  test('start method passes through error from store.init', async () => {
    store.init = () => {
      throw new Error('test error');
    };

    const poller = new TaskPoller({
      store,
      pollInterval: 1,
      logger: mockLogger(),
      work: sinon.stub(),
    });

    await expect(poller.start()).rejects.toMatchInlineSnapshot(`[Error: test error]`);
  });
});
