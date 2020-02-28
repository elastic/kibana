/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeSeriesQuerySchema } from './time_series_types';
import { runTests } from './core_query_types.test';

const DefaultParams = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  window: '5m',
};

describe('TimeSeriesParams validate()', () => {
  runTests(TimeSeriesQuerySchema, DefaultParams);

  let params: any;
  beforeEach(() => {
    params = { ...DefaultParams };
  });

  it('passes for minimal valid input', async () => {
    expect(validate()).toBeTruthy();
  });

  it('passes for maximal valid input', async () => {
    params.aggType = 'average';
    params.aggField = 'agg-field';
    params.groupField = 'group-field';
    params.groupLimit = 100;
    params.dateStart = new Date().toISOString();
    params.dateEnd = new Date().toISOString();
    params.interval = '1s';
    expect(validate()).toBeTruthy();
  });

  it('fails for invalid dateStart', async () => {
    params.dateStart = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[dateStart]: expected value of type [string] but got [number]"`
    );

    params.dateStart = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[dateStart]: invalid date x"`);
  });

  it('fails for invalid dateEnd', async () => {
    params.dateEnd = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[dateEnd]: expected value of type [string] but got [number]"`
    );

    params.dateEnd = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[dateEnd]: invalid date x"`);
  });

  it('fails for invalid interval', async () => {
    params.interval = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[interval]: expected value of type [string] but got [number]"`
    );

    params.interval = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[interval]: invalid duration: \\"x\\""`
    );
  });

  it('fails for dateStart > dateEnd', async () => {
    params.dateStart = '2021-01-01T00:00:00.000Z';
    params.dateEnd = '2020-01-01T00:00:00.000Z';
    params.interval = '1s';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[dateStart]: is greater than [dateEnd]"`
    );
  });

  it('fails for dateStart != dateEnd and no interval', async () => {
    params.dateStart = '2020-01-01T00:00:00.000Z';
    params.dateEnd = '2021-01-01T00:00:00.000Z';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[interval]: must be specified if [dateStart] does not equal [dateEnd]"`
    );
  });

  it('fails for too many intervals', async () => {
    params.dateStart = '2020-01-01T00:00:00.000Z';
    params.dateEnd = '2021-01-01T00:00:00.000Z';
    params.interval = '1s';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"calculated number of intervals 31622400 is greater than maximum 1000"`
    );
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): any {
    return TimeSeriesQuerySchema.validate(params);
  }
});
