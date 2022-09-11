/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import { findExceptionReferencesOnRuleSchema } from './find_exception_list_references_schema';
import type { FindExceptionReferencesOnRuleSchema } from './find_exception_list_references_schema';

describe('find_exception_list_references_schema', () => {
  test('validates all fields', () => {
    const payload: FindExceptionReferencesOnRuleSchema = {
      ids: 'abc,def',
      list_ids: '123,456',
      namespace_types: 'single,agnostic',
    };

    const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual({
      ids: ['abc', 'def'],
      list_ids: ['123', '456'],
      namespace_types: ['single', 'agnostic'],
    });
  });

  test('"ids" cannot be undefined', () => {
    const payload: Omit<FindExceptionReferencesOnRuleSchema, 'ids'> = {
      list_ids: '123,456',
      namespace_types: 'single,agnostic',
    };

    const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['Invalid value "undefined" supplied to "ids"']);
    expect(output.schema).toEqual({});
  });

  test('"list_ids" cannot be undefined', () => {
    const payload: Omit<FindExceptionReferencesOnRuleSchema, 'list_ids'> = {
      ids: 'abc',
      namespace_types: 'single',
    };

    const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([
      'Invalid value "undefined" supplied to "list_ids"',
    ]);
    expect(output.schema).toEqual({});
  });

  test('defaults "namespacetypes" to ["single"] if none set', () => {
    const payload: Omit<FindExceptionReferencesOnRuleSchema, 'namespace_types'> = {
      ids: 'abc',
      list_ids: '123',
    };

    const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual([]);
    expect(output.schema).toEqual({
      ids: ['abc'],
      list_ids: ['123'],
      namespace_types: ['single'],
    });
  });

  test('cannot add extra values', () => {
    const payload: FindExceptionReferencesOnRuleSchema & { extra_value?: string } = {
      ids: 'abc,def',
      list_ids: '123,456',
      namespace_types: 'single,agnostic',
      extra_value: 'aaa',
    };

    const decoded = findExceptionReferencesOnRuleSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const output = foldLeftRight(checked);
    expect(formatErrors(output.errors)).toEqual(['invalid keys "extra_value"']);
    expect(output.schema).toEqual({});
  });
});
