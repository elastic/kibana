/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParamsSchema, Params } from './alert_type_params';
import { runTests } from './lib/core_query_types.test';
import { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';

const DefaultParams: Writable<Partial<Params>> = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  groupBy: 'all',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: '>',
  threshold: [0],
};

describe('alertType Params validate()', () => {
  runTests(ParamsSchema, DefaultParams);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let params: any;
  beforeEach(() => {
    params = { ...DefaultParams };
  });

  it('passes for minimal valid input', async () => {
    expect(validate()).toBeTruthy();
  });

  it('passes for maximal valid input', async () => {
    params.aggType = 'avg';
    params.aggField = 'agg-field';
    params.groupBy = 'top';
    params.termField = 'group-field';
    params.termSize = 100;
    expect(validate()).toBeTruthy();
  });

  it('fails for invalid comparator', async () => {
    params.thresholdComparator = '[invalid-comparator]';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[thresholdComparator]: invalid thresholdComparator specified: [invalid-comparator]"`
    );
  });

  it('fails for invalid threshold length', async () => {
    params.thresholdComparator = '<';
    params.threshold = [0, 1, 2];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: array size is [3], but cannot be greater than [2]"`
    );

    params.thresholdComparator = 'between';
    params.threshold = [0];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: must have two elements for the \\"between\\" comparator"`
    );
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): TypeOf<typeof ParamsSchema> {
    return ParamsSchema.validate(params);
  }
});
