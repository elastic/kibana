/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, formatErrors, foldLeftRight } from '@kbn/securitysolution-io-ts-utils';
import {
  ruleReferenceSchema,
  rulesReferencedByExceptionListsSchema,
} from './find_exception_list_references_schema';
import type {
  RuleReferenceSchema,
  RulesReferencedByExceptionListsSchema,
} from './find_exception_list_references_schema';

describe('find_exception_list_references_schema', () => {
  describe('ruleReferenceSchema', () => {
    test('validates all fields', () => {
      const payload: RuleReferenceSchema = {
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
      };

      const decoded = ruleReferenceSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        exception_lists: [
          { id: 'myListId', list_id: 'my-list-id', namespace_type: 'single', type: 'detection' },
        ],
        id: '4656dc92-5832-11ea-8e2d-0242ac130003',
        name: 'My rule',
        rule_id: 'my-rule-id',
      });
    });

    test('cannot add extra values', () => {
      const payload: RuleReferenceSchema & { extra_value?: string } = {
        name: 'My rule',
        id: '4656dc92-5832-11ea-8e2d-0242ac130003',
        rule_id: 'my-rule-id',
        extra_value: 'foo',
        exception_lists: [
          {
            id: 'myListId',
            list_id: 'my-list-id',
            namespace_type: 'single',
            type: 'detection',
          },
        ],
      };

      const decoded = ruleReferenceSchema.decode(payload);
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
            'my-list-id': [
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
        ],
      };

      const decoded = rulesReferencedByExceptionListsSchema.decode(payload);
      const checked = exactCheck(payload, decoded);
      const output = foldLeftRight(checked);
      expect(formatErrors(output.errors)).toEqual([]);
      expect(output.schema).toEqual({
        references: [
          {
            'my-list-id': [
              {
                exception_lists: [
                  {
                    id: 'myListId',
                    list_id: 'my-list-id',
                    namespace_type: 'single',
                    type: 'detection',
                  },
                ],
                id: '4656dc92-5832-11ea-8e2d-0242ac130003',
                name: 'My rule',
                rule_id: 'my-rule-id',
              },
            ],
          },
        ],
      });
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
            'my-list-id': [
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
