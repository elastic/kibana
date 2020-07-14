/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  ExportListItemQuerySchema,
  exportListItemQuerySchema,
} from './export_list_item_query_schema';
import { getExportListItemQuerySchemaMock } from './export_list_item_query_schema.mock';

describe('export_list_item_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getExportListItemQuerySchemaMock();
    const decoded = exportListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for an id', () => {
    const payload = getExportListItemQuerySchemaMock();
    delete payload.list_id;
    const decoded = exportListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ExportListItemQuerySchema & {
      extraKey?: string;
    } = getExportListItemQuerySchemaMock();
    payload.extraKey = 'some new value';
    const decoded = exportListItemQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
