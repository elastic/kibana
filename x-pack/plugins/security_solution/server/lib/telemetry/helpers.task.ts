/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getLastTaskExecutionTimestamp } from './helpers';

describe('test scheduled task helpers', () => {
  test('test -5 mins is returned when there is no previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = undefined;
    const newExecuteFrom = getLastTaskExecutionTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(5, 'minutes').toISOString());
  });

  test('test -6 mins is returned when there was a previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(6, 'minutes').toISOString();
    const newExecuteFrom = getLastTaskExecutionTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(executeFrom);
  });

  // it's possible if Kibana is down for a prolonged period the stored lastRun would have drifted
  // if that is the case we will just roll it back to a 10 min search window
  test('test 10 mins is returned when previous task run took longer than 10 minutes', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(142, 'minutes').toISOString();
    const newExecuteFrom = getLastTaskExecutionTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(10, 'minutes').toISOString());
  });
});
