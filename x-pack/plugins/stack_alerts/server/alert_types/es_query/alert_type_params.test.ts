/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import { Comparator } from '../../../common/comparator_types';
import {
  EsQueryAlertParamsSchema,
  EsQueryAlertParams,
  ES_QUERY_MAX_HITS_PER_EXECUTION,
} from './alert_type_params';

const DefaultParams: Writable<Partial<EsQueryAlertParams>> = {
  index: ['index-name'],
  timeField: 'time-field',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.GT,
  threshold: [0],
};

describe('alertType Params validate()', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let params: any;
  beforeEach(() => {
    params = { ...DefaultParams };
  });

  it('passes for valid input', async () => {
    expect(validate()).toBeTruthy();
  });

  it('fails for invalid index', async () => {
    delete params.index;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[index]: expected value of type [array] but got [undefined]"`
    );

    params.index = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[index]: expected value of type [array] but got [number]"`
    );

    params.index = 'index-name';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[index]: could not parse array value from json input"`
    );

    params.index = [];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[index]: array size is [0], but cannot be smaller than [1]"`
    );

    params.index = ['', 'a'];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[index.0]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  it('fails for invalid timeField', async () => {
    delete params.timeField;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeField]: expected value of type [string] but got [undefined]"`
    );

    params.timeField = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeField]: expected value of type [string] but got [number]"`
    );

    params.timeField = '';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeField]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  it('fails for invalid esQuery', async () => {
    delete params.esQuery;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[esQuery]: expected value of type [string] but got [undefined]"`
    );

    params.esQuery = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[esQuery]: expected value of type [string] but got [number]"`
    );

    params.esQuery = '';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[esQuery]: value has length [0] but it must have a minimum length of [1]."`
    );

    params.esQuery = '{\n  "query":{\n    "match_all" : {}\n  }\n';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[esQuery]: must be valid JSON"`);

    params.esQuery = '{\n  "aggs":{\n    "match_all" : {}\n  }\n}';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[esQuery]: must contain \\"query\\""`
    );
  });

  it('fails for invalid size', async () => {
    delete params.size;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[size]: expected value of type [number] but got [undefined]"`
    );

    params.size = 'foo';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[size]: expected value of type [number] but got [string]"`
    );

    params.size = -1;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[size]: Value must be equal to or greater than [0]."`
    );

    params.size = ES_QUERY_MAX_HITS_PER_EXECUTION + 1;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[size]: Value must be equal to or lower than [10000]."`
    );
  });

  it('fails for invalid timeWindowSize', async () => {
    delete params.timeWindowSize;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeWindowSize]: expected value of type [number] but got [undefined]"`
    );

    params.timeWindowSize = 'foo';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeWindowSize]: expected value of type [number] but got [string]"`
    );

    params.timeWindowSize = 0;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeWindowSize]: Value must be equal to or greater than [1]."`
    );
  });

  it('fails for invalid timeWindowUnit', async () => {
    delete params.timeWindowUnit;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeWindowUnit]: expected value of type [string] but got [undefined]"`
    );

    params.timeWindowUnit = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeWindowUnit]: expected value of type [string] but got [number]"`
    );

    params.timeWindowUnit = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[timeWindowUnit]: invalid timeWindowUnit: \\"x\\""`
    );
  });

  it('fails for invalid threshold', async () => {
    params.threshold = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: expected value of type [array] but got [number]"`
    );

    params.threshold = 'x';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: could not parse array value from json input"`
    );

    params.threshold = [];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: array size is [0], but cannot be smaller than [1]"`
    );

    params.threshold = [1, 2, 3];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold]: array size is [3], but cannot be greater than [2]"`
    );

    params.threshold = ['foo'];
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[threshold.0]: expected value of type [number] but got [string]"`
    );
  });

  it('fails for invalid thresholdComparator', async () => {
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

  function validate(): TypeOf<typeof EsQueryAlertParamsSchema> {
    return EsQueryAlertParamsSchema.validate(params);
  }
});
