/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { MAX_GROUPS } from '@kbn/triggers-actions-ui-plugin/server';
import type { Writable } from '@kbn/utility-types';
import { Comparator } from '../../../common/comparator_types';
import { ES_QUERY_MAX_HITS_PER_EXECUTION } from '../../../common';
import { EsQueryRuleParamsSchema, EsQueryRuleParams, validateServerless } from './rule_type_params';

const DefaultParams: Writable<Partial<EsQueryRuleParams>> = {
  index: ['index-name'],
  timeField: 'time-field',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.GT,
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
};

describe('ruleType Params validate()', () => {
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

  it('fails for invalid aggType', async () => {
    params.aggType = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[aggType]: expected value of type [string] but got [number]"`
    );

    params.aggType = '-not-a-valid-aggType-';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[aggType]: invalid aggType: \\"-not-a-valid-aggType-\\""`
    );
  });

  it('uses default value "count" if aggType is undefined', async () => {
    params.aggType = undefined;
    expect(onValidate()).not.toThrow();
  });

  it('fails for invalid groupBy', async () => {
    params.groupBy = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[groupBy]: expected value of type [string] but got [number]"`
    );

    params.groupBy = '-not-a-valid-groupBy-';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[groupBy]: invalid groupBy: \\"-not-a-valid-groupBy-\\""`
    );
  });

  it('uses default value "all" if groupBy is undefined', async () => {
    params.groupBy = undefined;
    expect(onValidate()).not.toThrow();
  });

  it('fails for invalid aggField', async () => {
    params.aggField = 42;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[aggField]: expected value of type [string] but got [number]"`
    );

    params.aggField = '';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[aggField]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  it('fails for invalid termField', async () => {
    params.termField = ['term', 'term 2'];
    params.termSize = 1;
    expect(onValidate()).not.toThrow();

    params.termField = 'term';
    params.termSize = 1;
    expect(onValidate()).not.toThrow();

    // string or array of string
    params.groupBy = 'top';
    params.termField = 42;
    expect(onValidate()).toThrow(`[termField]: types that failed validation:
- [termField.0]: expected value of type [string] but got [number]
- [termField.1]: expected value of type [array] but got [number]`);

    // no array other than array of stings
    params.termField = [1, 2, 3];
    expect(onValidate()).toThrow(
      `[termField]: types that failed validation:
- [termField.0]: expected value of type [string] but got [Array]
- [termField.1.0]: expected value of type [string] but got [number]`
    );

    // no empty string
    params.termField = '';
    expect(onValidate()).toThrow(
      `[termField]: types that failed validation:
- [termField.0]: value has length [0] but it must have a minimum length of [1].
- [termField.1]: could not parse array value from json input`
    );

    // no array with one element -> has to be a string
    params.termField = ['term'];
    expect(onValidate()).toThrow(
      `[termField]: types that failed validation:
- [termField.0]: expected value of type [string] but got [Array]
- [termField.1]: array size is [1], but cannot be smaller than [2]`
    );

    // no array that has more than 4 elements
    params.termField = ['term', 'term2', 'term3', 'term4', 'term4'];
    expect(onValidate()).toThrow(
      `[termField]: types that failed validation:
- [termField.0]: expected value of type [string] but got [Array]
- [termField.1]: array size is [5], but cannot be greater than [4]`
    );
  });

  it('fails for invalid termSize', async () => {
    params.groupBy = 'top';
    params.termField = 'fee';
    params.termSize = 'foo';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[termSize]: expected value of type [number] but got [string]"`
    );

    params.termSize = MAX_GROUPS + 1;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[termSize]: must be less than or equal to 1000"`
    );

    params.termSize = 0;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[termSize]: Value must be equal to or greater than [1]."`
    );
  });

  it('fails for invalid aggType/aggField', async () => {
    params.aggType = 'avg';
    delete params.aggField;
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[aggField]: must have a value when [aggType] is \\"avg\\""`
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
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`
      "[thresholdComparator]: types that failed validation:
      - [thresholdComparator.0]: expected value to equal [>]
      - [thresholdComparator.1]: expected value to equal [<]
      - [thresholdComparator.2]: expected value to equal [>=]
      - [thresholdComparator.3]: expected value to equal [<=]
      - [thresholdComparator.4]: expected value to equal [between]
      - [thresholdComparator.5]: expected value to equal [notBetween]"
    `);
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

  it('fails for invalid excludeHitsFromPreviousRun', async () => {
    params.excludeHitsFromPreviousRun = '';
    expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
      `"[excludeHitsFromPreviousRun]: expected value of type [boolean] but got [string]"`
    );
  });

  it('uses default value "true" if excludeHitsFromPreviousRun is undefined', async () => {
    params.excludeHitsFromPreviousRun = undefined;
    expect(onValidate()).not.toThrow();
  });

  it('fails for invalid sourceFields', async () => {
    // no array that has more than 5 elements
    const sourceField = { label: 'test', searchPath: 'test' };
    params.sourceFields = [
      sourceField,
      sourceField,
      sourceField,
      sourceField,
      sourceField,
      sourceField,
    ];
    expect(onValidate()).toThrow(
      '[sourceFields]: array size is [6], but cannot be greater than [5]'
    );
  });

  describe('serverless', () => {
    it('fails for invalid size', async () => {
      params.size = 101;
      expect(onValidateServerless()).toThrowErrorMatchingInlineSnapshot(
        `"[size]: must be less than or equal to 100"`
      );
    });
  });

  describe('esqlQuery search type', () => {
    beforeEach(() => {
      params = { ...DefaultParams, searchType: 'esqlQuery', esqlQuery: { esql: 'from test' } };
      delete params.esQuery;
      delete params.index;
    });

    it('fails for invalid thresholdComparator', async () => {
      params.thresholdComparator = Comparator.LT;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[thresholdComparator]: is required to be greater than"`
      );
    });

    it('fails for invalid threshold', async () => {
      params.threshold = [7];
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[threshold]: is required to be 0"`);
    });

    it('fails for undefined timeField', async () => {
      params.timeField = undefined;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`"[timeField]: is required"`);
    });
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): TypeOf<typeof EsQueryRuleParamsSchema> {
    return EsQueryRuleParamsSchema.validate(params);
  }

  function onValidateServerless() {
    return () => validateServerless(params);
  }
});
