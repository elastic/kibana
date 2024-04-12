/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { BulkGetRulesSourcesRequestBody } from './bulk_get_sources_route.gen';

describe('Bulk get sources request schema', () => {
  test('should pass validation for an empty object', () => {
    const payload: BulkGetRulesSourcesRequestBody = {};

    const result = BulkGetRulesSourcesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('should pass validation if only query is specified', () => {
    const payload: BulkGetRulesSourcesRequestBody = { query: 'rules query' };

    const result = BulkGetRulesSourcesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('should pass validation if only ids are specified', () => {
    const payload: BulkGetRulesSourcesRequestBody = { ids: ['rule1', 'rule2'] };

    const result = BulkGetRulesSourcesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('should pass validation if both query and ids are specified', () => {
    const payload: BulkGetRulesSourcesRequestBody = {
      query: 'fetch all rules',
      ids: ['rule1', 'rule2'],
    };

    const result = BulkGetRulesSourcesRequestBody.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('should fail validation if passed ids is an empty array', () => {
    const payload: BulkGetRulesSourcesRequestBody = { ids: [] };

    const result = BulkGetRulesSourcesRequestBody.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"ids: Array must contain at least 1 element(s)"`
    );
  });
});
