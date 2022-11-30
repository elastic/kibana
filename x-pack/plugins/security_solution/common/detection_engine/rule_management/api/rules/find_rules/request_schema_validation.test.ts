/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesRequestQuery } from './request_schema';
import { validateFindRulesRequestQuery } from './request_schema_validation';

describe('Find rules request schema, additional validation', () => {
  describe('validateFindRulesRequestQuery', () => {
    test('You can have an empty sort_field and empty sort_order', () => {
      const schema: FindRulesRequestQuery = {};
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([]);
    });

    test('You can have both a sort_field and and a sort_order', () => {
      const schema: FindRulesRequestQuery = {
        sort_field: 'some field',
        sort_order: 'asc',
      };
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([]);
    });

    test('You cannot have sort_field without sort_order', () => {
      const schema: FindRulesRequestQuery = {
        sort_field: 'some field',
      };
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([
        'when "sort_order" and "sort_field" must exist together or not at all',
      ]);
    });

    test('You cannot have sort_order without sort_field', () => {
      const schema: FindRulesRequestQuery = {
        sort_order: 'asc',
      };
      const errors = validateFindRulesRequestQuery(schema);
      expect(errors).toEqual([
        'when "sort_order" and "sort_field" must exist together or not at all',
      ]);
    });
  });
});
