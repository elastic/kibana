/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import {
  CoverageOverviewRequestBody,
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from './coverage_overview_route';

describe('Coverage overview request schema', () => {
  test('empty object validates', () => {
    const payload: CoverageOverviewRequestBody = {};

    const decoded = CoverageOverviewRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('validates with all fields populated', () => {
    const payload: CoverageOverviewRequestBody = {
      filter: {
        activity: [CoverageOverviewRuleActivity.Enabled, CoverageOverviewRuleActivity.Disabled],
        source: [CoverageOverviewRuleSource.Custom, CoverageOverviewRuleSource.Prebuilt],
        search_term: 'search term',
      },
    };

    const decoded = CoverageOverviewRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('does NOT validate with extra fields', () => {
    const payload: CoverageOverviewRequestBody & { invalid_field: string } = {
      filter: {
        activity: [CoverageOverviewRuleActivity.Enabled, CoverageOverviewRuleActivity.Disabled],
        source: [CoverageOverviewRuleSource.Custom, CoverageOverviewRuleSource.Prebuilt],
        search_term: 'search term',
      },
      invalid_field: 'invalid field',
    };

    const decoded = CoverageOverviewRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual(['invalid keys "invalid_field"']);
    expect(message.schema).toEqual({});
  });

  test('does NOT validate with invalid filter values', () => {
    const payload: CoverageOverviewRequestBody = {
      filter: {
        // @ts-expect-error
        activity: ['Wrong activity field'],
        // @ts-expect-error
        source: ['Wrong source field'],
        search_term: 'search term',
      },
    };

    const decoded = CoverageOverviewRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "Wrong activity field" supplied to "filter,activity"',
      'Invalid value "Wrong source field" supplied to "filter,source"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('does NOT validate with empty filter arrays', () => {
    const payload: CoverageOverviewRequestBody = {
      filter: {
        activity: [],
        source: [],
        search_term: 'search term',
      },
    };

    const decoded = CoverageOverviewRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "filter,activity"',
      'Invalid value "[]" supplied to "filter,source"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('does NOT validate with empty search_term', () => {
    const payload: CoverageOverviewRequestBody = {
      filter: {
        search_term: '',
      },
    };

    const decoded = CoverageOverviewRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "" supplied to "filter,search_term"',
    ]);
    expect(message.schema).toEqual({});
  });
});
