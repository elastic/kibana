/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Chance from 'chance';
import _ from 'lodash';
import sinon from 'sinon';
import { taskClaimer } from './task_claimer';
import { genDocs, mockStore, runningDoc, sleep } from './test_utils';
import { TaskDoc } from './types';

describe('taskClaimer', () => {
  const chance = new Chance();

  test('it returns tasks in sequence', async () => {
    const docs = [genDocs(2), genDocs(1)];
    const allDocs = _.flatten(docs);
    const store = mockStore(docs);
    const mockFind = sinon.spy(store.availableTasks);

    store.availableTasks = mockFind;

    const claimer = taskClaimer({
      knownTypes: allDocs.map(d => d.type),
      store,
      tasks: [],
    });

    expect(await claimer()).toMatchObject(runningDoc(allDocs[0]));
    expect(await claimer()).toMatchObject(runningDoc(allDocs[1]));
    expect(await claimer()).toMatchObject(runningDoc(allDocs[2]));
    expect(await claimer()).toEqual(undefined);
    expect(mockFind.callCount).toEqual(3);
  });

  test('multiple calls share a pending promise', async () => {
    const docs = genDocs();
    const store = mockStore([docs]);
    const mockFind = sinon.stub();

    store.availableTasks = mockFind;

    const claimer = taskClaimer({
      knownTypes: docs.map(d => d.type),
      store,
      tasks: [],
    });

    mockFind
      .onCall(0)
      .returns(Promise.resolve(_.cloneDeep(docs)))
      .onCall(1)
      .throwsException('SHOULD NOT CALL');

    const actual = await Promise.all(docs.map(() => claimer()));
    expect(actual.map(d => d!.id)).toEqual(docs.map(d => d.id));
    expect(mockFind.callCount).toEqual(1);
  });

  test('recovers from connectivity errors when fetching', async () => {
    const docs = genDocs();
    const store = mockStore([docs]);
    const mockFind = sinon.stub();

    store.availableTasks = mockFind;

    const claimer = taskClaimer({
      knownTypes: docs.map(d => d.type),
      store,
      tasks: [],
    });

    mockFind
      .onCall(0)
      .throwsException()
      .onCall(1)
      .returns(Promise.resolve(_.cloneDeep(docs)));

    expect(claimer()).rejects.toThrow();

    // Wait for the internal promise handlers to flush
    await sleep();

    expect(await claimer()).toMatchObject({ id: docs[0].id });
    expect(mockFind.callCount).toEqual(2);
  });

  test('queries the task store with the supported tasks and running ids', async () => {
    const docs = genDocs();
    const store = mockStore([docs]);
    const mockFind = sinon.stub();
    const knownTypes = [chance.name(), chance.name()];
    const tasks = [
      {
        id: chance.guid(),
        promise: Promise.resolve(),
        startTime: new Date(),
        type: knownTypes[0],
      },
    ];

    store.availableTasks = mockFind;

    const claimer = taskClaimer({
      knownTypes,
      store,
      tasks,
    });

    mockFind.onCall(0).returns(Promise.resolve(_.cloneDeep(docs)));

    await claimer();
    sinon.assert.calledWith(mockFind, {
      knownTypes,
      runningIds: [tasks[0].id],
    });
  });

  test('handles other Kibana instances claiming docs', async () => {
    const docs = genDocs();
    const store = mockStore([docs]);
    const mockUpdate = sinon.fake((task: TaskDoc) => {
      if (task.id !== docs[2].id) {
        return Promise.reject({ statusCode: 409 });
      }
      return Promise.resolve(_.cloneDeep(task));
    });

    store.update = mockUpdate;

    const claimer = taskClaimer({
      knownTypes: docs.map(d => d.type),
      store,
      tasks: [],
    });

    expect(await claimer()).toMatchObject(runningDoc(docs[2]));
    expect(mockUpdate.callCount).toEqual(3);
  });

  test('defaults timeout to 5 minutes', async () => {
    const docs = genDocs();

    docs[0].interval = undefined;

    const store = mockStore([docs]);
    const mockUpdate = sinon.fake(store.update);

    store.update = mockUpdate;

    const claimer = taskClaimer({
      knownTypes: docs.map(d => d.type),
      store,
      tasks: [],
    });

    const inFiveMins = Date.now() + 5 * 60 * 1000;

    expect(await claimer()).toMatchObject(runningDoc(docs[0]));

    const { timeOut } = mockUpdate.args[0][0];

    expect(timeOut.getTime() - inFiveMins).toBeLessThan(100);
  });

  test('if interval is specified, then timeout is the same as the interval', async () => {
    const docs = genDocs();

    docs[0].interval = '200m';

    const store = mockStore([docs]);
    const mockUpdate = sinon.fake(store.update);

    store.update = mockUpdate;

    const claimer = taskClaimer({
      knownTypes: docs.map(d => d.type),
      store,
      tasks: [],
    });

    const inFiveMins = Date.now() + 200 * 60 * 1000;

    expect(await claimer()).toMatchObject(runningDoc(docs[0]));

    const { timeOut } = mockUpdate.args[0][0];

    expect(timeOut.getTime() - inFiveMins).toBeLessThan(100);
  });
});
