/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import {
  getOutputDetailsSample,
  getOutputDetailsSampleWithExceptions,
} from './export_rules_details_schema.mock';
import { ExportRulesDetails, exportRulesDetailsSchema } from './export_rules_details_schema';

describe('exportRulesDetailsSchema', () => {
  test('it should validate export details response', () => {
    const payload = getOutputDetailsSample();
    const decoded = exportRulesDetailsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate export details with exceptions details response', () => {
    const payload = getOutputDetailsSampleWithExceptions();
    const decoded = exportRulesDetailsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a count that is a negative number', () => {
    const payload: ExportRulesDetails = getOutputDetailsSample({ totalCount: -1 });
    const decoded = exportRulesDetailsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "total_count"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: ExportRulesDetails & {
      extraKey?: string;
    } = getOutputDetailsSample();
    payload.extraKey = 'some extra key';
    const decoded = exportRulesDetailsSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getOutputDetailsSample());
  });
});
