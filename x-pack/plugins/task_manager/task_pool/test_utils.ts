/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { TaskDoc, TaskStatus, TaskStore } from './types';

export function sleep() {
  return new Promise(r => process.nextTick(r));
}

export function mockStore(docs: TaskDoc[][]): TaskStore {
  let docsIndex = 0;

  return {
    availableTasks: sinon.spy(async () => {
      const result = _.cloneDeep(docs[docsIndex]);
      ++docsIndex;
      return result || [];
    }),

    remove: sinon.spy(() => Promise.resolve(true)),

    update: sinon.spy((task: TaskDoc) => Promise.resolve(_.cloneDeep(task))),
  };
}

export function genDoc(): TaskDoc {
  return {
    attempts: 0,
    id: `test_task:${_.uniqueId()}`,
    nextRun: new Date(Date.now() + 2000),
    params: {},
    previousResult: {},
    status: 'running',
    timeOut: new Date(Date.now() + 3000),
    type: 'test_task',
    version: 2,
  };
}

export function genDocs(n = 10): TaskDoc[] {
  return _.range(0, n).map(genDoc);
}

export function runningDoc(doc: TaskDoc) {
  return _.omit(
    {
      ...doc,
      status: 'running',
    },
    'timeOut'
  );
}
