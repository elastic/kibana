/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '../elasticsearch_fieldnames';
import { ENVIRONMENT_NOT_DEFINED } from '../environment_filter_values';
import { environmentQuery } from './environment_query';

describe('environmentQuery', () => {
  describe('when environment is an empty string', () => {
    it('returns an empty query', () => {
      expect(environmentQuery('')).toEqual([]);
    });
  });

  it('creates a query for a service environment', () => {
    expect(environmentQuery('test')).toEqual([
      {
        term: { [SERVICE_ENVIRONMENT]: 'test' },
      },
    ]);
  });

  it('creates a query for missing service environments', () => {
    expect(environmentQuery(ENVIRONMENT_NOT_DEFINED.value)[0]).toHaveProperty(
      ['bool', 'must_not', 'exists', 'field'],
      SERVICE_ENVIRONMENT
    );
  });
});
