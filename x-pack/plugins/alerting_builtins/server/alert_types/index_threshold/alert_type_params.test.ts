/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParamsSchema } from './alert_type_params';
import { runTests } from './lib/core_query_types.test';

const DefaultParams = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  window: '5m',
  comparator: 'greaterThan',
  threshold: [0],
};

describe('alertType Params validate()', () => {
  runTests(ParamsSchema, DefaultParams);

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
    expect(validate()).toBeTruthy();
  });

  it('fails for invalid comparator', async () => {
    params.comparator = '[invalid-comparator]';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[comparator]: invalid comparator specified: [invalid-comparator]"`
    );
  });

  it('fails for invalid threshold length', async () => {
    params.comparator = 'lessThan';
    params.threshold = [0, 1];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: must have one element for the \\"lessThan\\" comparator"`
    );

    params.comparator = 'between';
    params.threshold = [0];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: must have two elements for the \\"between\\" comparator"`
    );
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): any {
    return ParamsSchema.validate(params);
  }
});
