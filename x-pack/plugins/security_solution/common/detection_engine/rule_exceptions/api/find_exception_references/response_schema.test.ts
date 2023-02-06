/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import {
  exceptionListRuleReferencesSchema,
  rulesReferencedByExceptionListsSchema,
} from './response_schema';
import type {
  ExceptionListRuleReferencesSchema,
  RulesReferencedByExceptionListsSchema,
} from './response_schema';

describe('Find exception list references response schema', () => {
  describe('exceptionListRuleReferencesSchema', () => {
    test('validates all fields', () => {
      const payload: ExceptionListRuleReferencesSchema = {
        ...getExceptionListSchemaMock(),
        referenced_rules: [
          {
            name: 'My rule',
            id: '4656dc92-5832-11ea-8e2d-0242ac130003',
            rule_id: 'my-rule-id',
            exception_lists: [
              {
                id: 'myListId',
                list_id: 'my-list-id',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          },
        ],
      };

      const decoded = exceptionListRuleReferencesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual(payload);
    });

    test('cannot add extra values', () => {
      const payload: ExceptionListRuleReferencesSchema & { extra_value?: string } = {
        extra_value: 'foo',
        ...getExceptionListSchemaMock(),
        referenced_rules: [
          {
            name: 'My rule',
            id: '4656dc92-5832-11ea-8e2d-0242ac130003',
            rule_id: 'my-rule-id',
            exception_lists: [
              {
                id: 'myListId',
                list_id: 'my-list-id',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          },
        ],
      };

      const decoded = exceptionListRuleReferencesSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual(['invalid keys "extra_value"']);
      expect(output.schema).toEqual({});
    });
  });

  describe('rulesReferencedByExceptionListsSchema', () => {
    test('validates all fields', () => {
      const payload: RulesReferencedByExceptionListsSchema = {
        references: [
          {
            'my-list-id': {
              ...getExceptionListSchemaMock(),
              referenced_rules: [
                {
                  name: 'My rule',
                  id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                  rule_id: 'my-rule-id',
                  exception_lists: [
                    {
                      id: 'myListId',
                      list_id: 'my-list-id',
                      namespace_type: 'single',
                      type: 'detection',
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual(payload);
    });

    test('validates "references" with empty array', () => {
      const payload: RulesReferencedByExceptionListsSchema = {
        references: [],
      };

      const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        references: [],
      });
    });

    test('cannot add extra values', () => {
      const payload: RulesReferencedByExceptionListsSchema & { extra_value?: string } = {
        extra_value: 'foo',
        references: [
          {
            'my-list-id': {
              ...getExceptionListSchemaMock(),
              referenced_rules: [
                {
                  name: 'My rule',
                  id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                  rule_id: 'my-rule-id',
                  exception_lists: [
                    {
                      id: 'myListId',
                      list_id: 'my-list-id',
                      namespace_type: 'single',
                      type: 'detection',
                    },
                  ],
                },
              ],
            },
          },
        ],
      };

      const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual(['invalid keys "extra_value"']);
      expect(output.schema).toEqual({});
    });
  });
});
