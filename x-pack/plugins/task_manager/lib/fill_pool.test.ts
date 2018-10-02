/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { fillPool } from './fill_pool';

describe('fillPool', () => {
  test('stops filling when there are no more tasks in the store', async () => {
    const tasks = [[1, 2, 3], [4, 5]];
    let index = 0;
    const fetchAvailableTasks = async () => tasks[index++] || [];
    const run = sinon.spy(() => true);
    const converter = _.identity;

    await fillPool(run, fetchAvailableTasks, converter);

    expect(_.flattenDeep(run.args)).toEqual([1, 2, 3, 4, 5]);
  });

  test('stops filling when the pool has no more capacity', async () => {
    const tasks = [[1, 2, 3], [4, 5]];
    let index = 0;
    const fetchAvailableTasks = async () => tasks[index++] || [];
    const run = sinon.spy(() => false);
    const converter = _.identity;

    await fillPool(run, fetchAvailableTasks, converter);

    expect(_.flattenDeep(run.args)).toEqual([1, 2, 3]);
  });

  test('calls the converter on the records prior to running', async () => {
    const tasks = [[1, 2, 3], [4, 5]];
    let index = 0;
    const fetchAvailableTasks = async () => tasks[index++] || [];
    const run = sinon.spy(() => false);
    const converter = (x: number) => x.toString();

    await fillPool(run, fetchAvailableTasks, converter);

    expect(_.flattenDeep(run.args)).toEqual(['1', '2', '3']);
  });
});
