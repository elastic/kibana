/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import type { ExportRulesRequestQueryInput } from './export_rules_route.gen';
import { ExportRulesRequestBody, ExportRulesRequestQuery } from './export_rules_route.gen';

describe('Export rules request schema', () => {
  describe('ExportRulesRequestBody', () => {
    test('null value or absent values validate', () => {
      const payload: Partial<ExportRulesRequestBody> = null;

      const result = ExportRulesRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('empty object does not validate', () => {
      const payload = {};

      const result = ExportRulesRequestBody.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual('objects: Required');
    });

    test('empty object array does validate', () => {
      const payload: ExportRulesRequestBody = { objects: [] };

      const result = ExportRulesRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('array with rule_id validates', () => {
      const payload: ExportRulesRequestBody = { objects: [{ rule_id: 'test-1' }] };

      const result = ExportRulesRequestBody.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(payload);
    });

    test('array with id does not validate as we do not allow that on purpose since we export rule_id', () => {
      const payload: Omit<ExportRulesRequestBody, 'objects'> & { objects: [{ id: string }] } = {
        objects: [{ id: '4a7ff83d-3055-4bb2-ba68-587b9c6c15a4' }],
      };

      const result = ExportRulesRequestBody.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual('objects.0.rule_id: Required');
    });
  });

  describe('ExportRulesRequestQuery', () => {
    test('default value for file_name is export.ndjson and default for exclude_export_details is false', () => {
      const payload: ExportRulesRequestQueryInput = {};

      const expected: ExportRulesRequestQuery = {
        file_name: 'export.ndjson',
        exclude_export_details: false,
      };

      const result = ExportRulesRequestQuery.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    test('file_name validates', () => {
      const payload: ExportRulesRequestQueryInput = {
        file_name: 'test.ndjson',
      };

      const expected: ExportRulesRequestQuery = {
        file_name: 'test.ndjson',
        exclude_export_details: false,
      };

      const result = ExportRulesRequestQuery.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    test('file_name does not validate with a number', () => {
      const payload: Omit<ExportRulesRequestQueryInput, 'file_name'> & { file_name: number } = {
        file_name: 10,
      };

      const result = ExportRulesRequestQuery.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        'file_name: Expected string, received number'
      );
    });

    test('exclude_export_details validates with a boolean true', () => {
      const payload: ExportRulesRequestQueryInput = {
        exclude_export_details: true,
      };

      const expected: ExportRulesRequestQuery = {
        exclude_export_details: true,
        file_name: 'export.ndjson',
      };

      const result = ExportRulesRequestQuery.safeParse(payload);
      expectParseSuccess(result);
      expect(result.data).toEqual(expected);
    });

    test('exclude_export_details does not validate with a string', () => {
      const payload: Omit<ExportRulesRequestQueryInput, 'exclude_export_details'> & {
        exclude_export_details: string;
      } = {
        exclude_export_details: 'invalid string',
      };

      const result = ExportRulesRequestQuery.safeParse(payload);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toEqual(
        `exclude_export_details: Invalid enum value. Expected 'true' | 'false', received 'invalid string', exclude_export_details: Expected boolean, received string`
      );
    });
  });
});
