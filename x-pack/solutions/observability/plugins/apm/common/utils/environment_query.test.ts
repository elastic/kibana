/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '../es_fields/apm';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '../environment_filter_values';
import { environmentQuery } from './environment_query';

describe('environmentQuery', () => {
  describe('when environment is an empty string', () => {
    it('returns ENVIRONMENT_NOT_DEFINED', () => {
      expect(environmentQuery('')).toEqual([
        {
          bool: {
            should: [
              {
                term: { [SERVICE_ENVIRONMENT]: ENVIRONMENT_NOT_DEFINED.value },
              },
              {
                bool: {
                  must_not: [
                    {
                      exists: { field: SERVICE_ENVIRONMENT },
                    },
                  ],
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ]);
    });
  });

  it('creates a query for a service environment', () => {
    expect(environmentQuery('test')).toEqual([
      {
        term: { [SERVICE_ENVIRONMENT]: 'test' },
      },
    ]);
  });

  it('creates a query for all environments', () => {
    expect(environmentQuery(ENVIRONMENT_ALL.value)).toEqual([]);
  });

  it('creates a query for missing service environments', () => {
    expect(environmentQuery(ENVIRONMENT_NOT_DEFINED.value)).toEqual([
      {
        bool: {
          should: [
            {
              term: { [SERVICE_ENVIRONMENT]: ENVIRONMENT_NOT_DEFINED.value },
            },
            {
              bool: {
                must_not: [
                  {
                    exists: { field: SERVICE_ENVIRONMENT },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });
});
