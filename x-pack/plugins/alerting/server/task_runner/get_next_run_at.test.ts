/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNextRunAt } from './get_next_run_at';

const mockedNow = new Date('2019-06-03T18:55:25.982Z');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Date = class Date extends global.Date {
  static now() {
    return mockedNow.getTime();
  }
};

test('Adds interface to given date when result is > Date.now()', () => {
  const currentRunAt = new Date('2019-06-03T18:55:23.982Z');
  const result = getNextRunAt(currentRunAt, { interval: '10s' });
  expect(result).toEqual(new Date('2019-06-03T18:55:33.982Z'));
});

test('Uses Date.now() when the result would of been a date in the past', () => {
  const currentRunAt = new Date('2019-06-03T18:55:13.982Z');
  const result = getNextRunAt(currentRunAt, { interval: '10s' });
  expect(result).toEqual(mockedNow);
});
