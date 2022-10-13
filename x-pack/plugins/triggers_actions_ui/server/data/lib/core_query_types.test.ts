/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// tests of common properties on time_series_query and alert_type_params

import { ObjectType } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import { CoreQueryParams } from './core_query_types';
import { MAX_GROUPS } from '..';

const DefaultParams: Writable<Partial<CoreQueryParams>> = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  groupBy: 'all',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
};

export function runTests(schema: ObjectType, defaultTypeParams: Record<string, unknown>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let params: any;

  describe('coreQueryTypes', () => {
    beforeEach(() => {
      params = { ...DefaultParams, ...defaultTypeParams };
    });

    it('succeeds with minimal properties', async () => {
      expect(validate()).toBeTruthy();
    });

    it('succeeds with maximal properties', async () => {
      params.aggType = 'avg';
      params.aggField = 'agg-field';
      params.groupBy = 'top';
      params.termField = 'group-field';
      params.termSize = 200;
      expect(validate()).toBeTruthy();

      params.index = ['index-name-1', 'index-name-2'];
      params.aggType = 'avg';
      params.aggField = 'agg-field';
      params.groupBy = 'top';
      params.termField = 'group-field';
      params.termSize = 200;
      expect(validate()).toBeTruthy();
    });

    it('fails for invalid index', async () => {
      delete params.index;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[index]: expected at least one defined value but got [undefined]"`
      );

      params.index = 42;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`
"[index]: types that failed validation:
- [index.0]: expected value of type [string] but got [number]
- [index.1]: expected value of type [array] but got [number]"
`);

      params.index = '';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`
"[index]: types that failed validation:
- [index.0]: value has length [0] but it must have a minimum length of [1].
- [index.1]: could not parse array value from json input"
`);

      params.index = ['', 'a'];
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(`
"[index]: types that failed validation:
- [index.0]: expected value of type [string] but got [Array]
- [index.1.0]: value has length [0] but it must have a minimum length of [1]."
`);
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
      params.groupBy = 'top';
      params.termField = 42;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[termField]: expected value of type [string] but got [number]"`
      );

      params.termField = '';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[termField]: value has length [0] but it must have a minimum length of [1]."`
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

    it('fails for invalid timeWindowSize', async () => {
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
      params.timeWindowUnit = 42;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[timeWindowUnit]: expected value of type [string] but got [number]"`
      );

      params.timeWindowUnit = 'x';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[timeWindowUnit]: invalid timeWindowUnit: \\"x\\""`
      );
    });

    it('fails for invalid aggType/aggField', async () => {
      params.aggType = 'avg';
      delete params.aggField;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[aggField]: must have a value when [aggType] is \\"avg\\""`
      );
    });
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): unknown {
    return schema.validate(params);
  }
}

describe('coreQueryTypes wrapper', () => {
  test('this test suite is meant to be called via the export', () => {});
});
