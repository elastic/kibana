/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { createMockPackagePolicy } from './mocks';
import {
  getPreviousDiagTaskTimestamp,
  getPreviousEpMetaTaskTimestamp,
  batchTelemetryRecords,
  isPackagePolicyList,
} from './helpers';

describe('test diagnostic telemetry scheduled task timing helper', () => {
  test('test -5 mins is returned when there is no previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = undefined;
    const newExecuteFrom = getPreviousDiagTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(5, 'minutes').toISOString());
  });

  test('test -6 mins is returned when there was a previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(6, 'minutes').toISOString();
    const newExecuteFrom = getPreviousDiagTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(executeFrom);
  });

  // it's possible if Kibana is down for a prolonged period the stored lastRun would have drifted
  // if that is the case we will just roll it back to a 10 min search window
  test('test 10 mins is returned when previous task run took longer than 10 minutes', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(142, 'minutes').toISOString();
    const newExecuteFrom = getPreviousDiagTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(10, 'minutes').toISOString());
  });
});

describe('test endpoint meta telemetry scheduled task timing helper', () => {
  test('test -24 hours is returned when there is no previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = undefined;
    const newExecuteFrom = getPreviousEpMetaTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(24, 'hours').toISOString());
  });

  test('test -24 hours is returned when there was a previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(24, 'hours').toISOString();
    const newExecuteFrom = getPreviousEpMetaTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(executeFrom);
  });

  // it's possible if Kibana is down for a prolonged period the stored lastRun would have drifted
  // if that is the case we will just roll it back to a 30 hour search window
  test('test 24 hours is returned when previous task run took longer than 24 hours', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(72, 'hours').toISOString(); // down 3 days
    const newExecuteFrom = getPreviousEpMetaTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(24, 'hours').toISOString());
  });
});

describe('telemetry batching logic', () => {
  test('records can be batched oddly as they are sent to the telemetry channel', async () => {
    const stubTelemetryRecords = [...Array(10).keys()];
    const batchSize = 3;

    const records = batchTelemetryRecords(stubTelemetryRecords, batchSize);
    expect(records.length).toEqual(4);
  });

  test('records can be batched evenly as they are sent to the telemetry channel', async () => {
    const stubTelemetryRecords = [...Array(299).keys()];
    const batchSize = 100;

    const records = batchTelemetryRecords(stubTelemetryRecords, batchSize);
    expect(records.length).toEqual(3);
  });

  test('empty telemetry records wont be batched', async () => {
    const stubTelemetryRecords = [...Array(0).keys()];
    const batchSize = 100;

    const records = batchTelemetryRecords(stubTelemetryRecords, batchSize);
    expect(records.length).toEqual(0);
  });
});

describe('test package policy type guard', () => {
  test('string records are not package policies', async () => {
    const arr = ['a', 'b', 'c'];
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(false);
  });

  test('empty array are not package policies', () => {
    const arr: string[] = [];
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(false);
  });

  test('undefined is not a list of package policies', () => {
    const arr = undefined;
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(false);
  });

  test('package policies are list of package policies', () => {
    const arr = [createMockPackagePolicy(), createMockPackagePolicy(), createMockPackagePolicy()];
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(true);
  });
});
