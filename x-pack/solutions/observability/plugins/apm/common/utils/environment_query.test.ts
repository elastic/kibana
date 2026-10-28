/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
} from '../es_fields/apm';
import { ENVIRONMENT_ALL, ENVIRONMENT_NOT_DEFINED } from '../environment_filter_values';
import { environmentQuery } from './environment_query';

const notDefinedQuery = [
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
              {
                exists: { field: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME },
              },
            ],
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

describe('environmentQuery', () => {
  describe('when environment is an empty string', () => {
    it('returns ENVIRONMENT_NOT_DEFINED', () => {
      expect(environmentQuery('')).toEqual(notDefinedQuery);
    });
  });

  it('creates a query matching either service.environment or the OTel deployment.environment.name attribute', () => {
    expect(environmentQuery('test')).toEqual([
      {
        bool: {
          should: [
            { term: { [SERVICE_ENVIRONMENT]: 'test' } },
            { term: { [RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME]: 'test' } },
          ],
          minimum_should_match: 1,
        },
      },
    ]);
  });

  it('creates a query for all environments', () => {
    expect(environmentQuery(ENVIRONMENT_ALL.value)).toEqual([]);
  });

  it('creates a query for missing service environments that requires both fields to be absent', () => {
    expect(environmentQuery(ENVIRONMENT_NOT_DEFINED.value)).toEqual(notDefinedQuery);
  });
});
