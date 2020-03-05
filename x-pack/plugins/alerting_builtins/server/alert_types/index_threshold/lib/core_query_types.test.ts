/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// tests of common properties on time_series_query and alert_type_params

import { ObjectType } from '@kbn/config-schema';

import { MAX_GROUPS } from '../index';

const DefaultParams: Record<string, any> = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  window: '5m',
};

export function runTests(schema: ObjectType, defaultTypeParams: Record<string, any>): void {
  let params: any;

  describe('coreQueryTypes', () => {
    beforeEach(() => {
      params = { ...DefaultParams, ...defaultTypeParams };
    });

    it('succeeds with minimal properties', async () => {
      expect(validate()).toBeTruthy();
    });

    it('succeeds with maximal properties', async () => {
      params.aggType = 'average';
      params.aggField = 'agg-field';
      params.groupField = 'group-field';
      params.groupLimit = 200;
      expect(validate()).toBeTruthy();
    });

    it('fails for invalid index', async () => {
      delete params.index;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[index]: expected value of type [string] but got [undefined]"`
      );

      params.index = 42;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[index]: expected value of type [string] but got [number]"`
      );

      params.index = '';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[index]: value is [] but it must have a minimum length of [1]."`
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
        `"[timeField]: value is [] but it must have a minimum length of [1]."`
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
        `"[aggField]: value is [] but it must have a minimum length of [1]."`
      );
    });

    it('fails for invalid groupField', async () => {
      params.groupField = 42;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[groupField]: expected value of type [string] but got [number]"`
      );

      params.groupField = '';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[groupField]: value is [] but it must have a minimum length of [1]."`
      );
    });

    it('fails for invalid groupLimit', async () => {
      params.groupLimit = 'foo';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[groupLimit]: expected value of type [number] but got [string]"`
      );

      params.groupLimit = 0;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[groupLimit]: must be greater than 0"`
      );

      params.groupLimit = MAX_GROUPS + 1;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[groupLimit]: must be less than or equal to 1000"`
      );
    });

    it('fails for invalid window', async () => {
      params.window = 42;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[window]: expected value of type [string] but got [number]"`
      );

      params.window = 'x';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[window]: invalid duration: \\"x\\""`
      );
    });

    it('fails for invalid aggType/aggField', async () => {
      params.aggType = 'count';
      params.aggField = 'agg-field-1';
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[aggField]: must not have a value when [aggType] is \\"count\\""`
      );

      params.aggType = 'average';
      delete params.aggField;
      expect(onValidate()).toThrowErrorMatchingInlineSnapshot(
        `"[aggField]: must have a value when [aggType] is \\"average\\""`
      );
    });
  });

  function onValidate(): () => void {
    return () => validate();
  }

  function validate(): any {
    return schema.validate(params);
  }
}

describe('coreQueryTypes wrapper', () => {
  test('this test suite is meant to be called via the export', () => {});
});
