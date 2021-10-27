/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestRuntimeFieldSearch } from '.';
import { SearchStrategyDependencies } from '../../../../../../src/plugins/data/server';

describe('requestRuntimeFieldSearch ', () => {
  const fieldName = 'testField';
  const mockPattern = {
    title: 'testPattern',
    toSpec: () => ({
      runtimeFieldMap: { runtimeField: { type: 'keyword' } },
      fields: {
        testField: {
          name: 'testField',
          type: 'type',
          searchable: true,
          aggregatable: true,
        },
      },
    }),
  };

  const getStartServices = jest.fn().mockReturnValue([
    null,
    {
      data: {
        indexPatterns: {
          indexPatternsServiceFactory: () => ({
            get: jest.fn().mockReturnValue(mockPattern),
          }),
        },
      },
    },
  ]);

  const deps = {
    esClient: { asCurrentUser: {} },
  } as SearchStrategyDependencies;

  it('should search runtime field by data view id', async () => {
    const dataViewId = 'id';
    const request = { dataViewId, fieldName };

    const response = await requestRuntimeFieldSearch(request, deps, getStartServices);

    expect(response.indexField.name).toBe(fieldName);
  });
});
