/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTermsAggRequest } from './query_field_value_pairs';

describe('query_field_value_pairs', () => {
  describe('getTermsAggRequest()', () => {
    it('returns the most basic request body for a terms aggregation', () => {
      const req = getTermsAggRequest({ index: 'apm-*' }, 'myFieldName');
      expect(req?.body?.aggs?.attribute_terms?.terms?.field).toBe(
        'myFieldName'
      );
    });
  });
});
