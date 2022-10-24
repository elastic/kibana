/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { ImportRulesRequestBody } from './request_schema';

describe('Import rules schema', () => {
  describe('ImportRulesRequestBody', () => {
    test('does not validate with an empty object', () => {
      const payload = {};

      const decoded = ImportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "file"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('does not validate with a made string', () => {
      const payload: Omit<ImportRulesRequestBody, 'file'> & { madeUpKey: string } = {
        madeUpKey: 'madeupstring',
      };

      const decoded = ImportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "file"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('does validate with a file object', () => {
      const payload: ImportRulesRequestBody = { file: {} };

      const decoded = ImportRulesRequestBody.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });
  });
});
