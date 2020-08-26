/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultExportFileName } from './default_export_file_name';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';

describe('default_export_file_name', () => {
  test('it should validate a regular string', () => {
    const payload = 'some string';
    const decoded = DefaultExportFileName.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = DefaultExportFileName.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultExportFileName"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default of "export.ndjson"', () => {
    const payload = null;
    const decoded = DefaultExportFileName.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual('export.ndjson');
  });
});
