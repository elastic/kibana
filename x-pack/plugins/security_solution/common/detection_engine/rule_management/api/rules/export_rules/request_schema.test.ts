/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { ExportRulesRequestBody, ExportRulesRequestQuery } from './request_schema';
import type { ExportRulesRequestQueryDecoded } from './request_schema';

describe('Export rules request schema', () => {
  describe('ExportRulesRequestBody', () => {
    test('null value or absent values validate', () => {
      const payload: Partial<ExportRulesRequestBody> = null;

      const decoded = ExportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('empty object does not validate', () => {
      const payload = {};

      const decoded = ExportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "objects"',
        'Invalid value "{}" supplied to "({| objects: Array<{| rule_id: string |}> |} | null)"',
      ]);
      expect(message.schema).toEqual(payload);
    });

    test('empty object array does validate', () => {
      const payload: ExportRulesRequestBody = { objects: [] };

      const decoded = ExportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('array with rule_id validates', () => {
      const payload: ExportRulesRequestBody = { objects: [{ rule_id: 'test-1' }] };

      const decoded = ExportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('array with id does not validate as we do not allow that on purpose since we export rule_id', () => {
      const payload: Omit<ExportRulesRequestBody, 'objects'> & { objects: [{ id: string }] } = {
        objects: [{ id: '4a7ff83d-3055-4bb2-ba68-587b9c6c15a4' }],
      };

      const decoded = ExportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "objects,rule_id"',
        'Invalid value "{"objects":[{"id":"4a7ff83d-3055-4bb2-ba68-587b9c6c15a4"}]}" supplied to "({| objects: Array<{| rule_id: string |}> |} | null)"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('ExportRulesRequestQuery', () => {
    test('default value for file_name is export.ndjson and default for exclude_export_details is false', () => {
      const payload: Partial<ExportRulesRequestQuery> = {};

      const decoded = ExportRulesRequestQuery.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ExportRulesRequestQueryDecoded = {
        file_name: 'export.ndjson',
        exclude_export_details: false,
      };
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('file_name validates', () => {
      const payload: ExportRulesRequestQuery = {
        file_name: 'test.ndjson',
      };

      const decoded = ExportRulesRequestQuery.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ExportRulesRequestQueryDecoded = {
        file_name: 'test.ndjson',
        exclude_export_details: false,
      };
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(expected);
    });

    test('file_name does not validate with a number', () => {
      const payload: Omit<ExportRulesRequestQuery, 'file_name'> & { file_name: number } = {
        file_name: 10,
      };

      const decoded = ExportRulesRequestQuery.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "10" supplied to "file_name"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('exclude_export_details validates with a boolean true', () => {
      const payload: ExportRulesRequestQuery = {
        exclude_export_details: true,
      };

      const decoded = ExportRulesRequestQuery.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      const expected: ExportRulesRequestQueryDecoded = {
        exclude_export_details: true,
        file_name: 'export.ndjson',
      };
      expect(message.schema).toEqual(expected);
    });

    test('exclude_export_details does not validate with a string', () => {
      const payload: Omit<ExportRulesRequestQuery, 'exclude_export_details'> & {
        exclude_export_details: string;
      } = {
        exclude_export_details: 'invalid string',
      };

      const decoded = ExportRulesRequestQuery.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "invalid string" supplied to "exclude_export_details"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
