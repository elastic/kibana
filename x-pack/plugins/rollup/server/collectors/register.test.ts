/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { registerRollupUsageCollector } from './register';

describe('registerRollupUsageCollector', () => {
  const mockIndex = 'mock_index';

  it('makes a usage collector and registers it`', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerRollupUsageCollector(mockCollectorSet, mockIndex);
    expect(mockCollectorSet.makeUsageCollector).toBeCalledTimes(1);
    expect(mockCollectorSet.registerCollector).toBeCalledTimes(1);
  });

  it('makeUsageCollector configs fit the shape', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerRollupUsageCollector(mockCollectorSet, mockIndex);
    expect(mockCollectorSet.makeUsageCollector).toHaveBeenCalledWith({
      type: 'rollups',
      isReady: expect.any(Function),
      fetch: expect.any(Function),
      schema: {
        index_patterns: {
          total: {
            type: 'long',
            _meta: {
              description: 'Counts all the rollup index patterns',
            },
          },
        },
        saved_searches: {
          total: {
            type: 'long',
            _meta: {
              description: 'Counts all the rollup saved searches',
            },
          },
        },
        visualizations: {
          saved_searches: {
            total: {
              type: 'long',
              _meta: {
                description:
                  'Counts all the visualizations that are based on rollup saved searches',
              },
            },
            lens_total: {
              type: 'long',
              _meta: {
                description:
                  'Counts all the lens visualizations that are based on rollup saved searches',
              },
            },
          },
          total: {
            type: 'long',
            _meta: {
              description: 'Counts all the visualizations that are based on rollup index patterns',
            },
          },
          lens_total: {
            type: 'long',
            _meta: {
              description:
                'Counts all the lens visualizations that are based on rollup index patterns',
            },
          },
        },
      },
    });
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });

  it('makeUsageCollector config.isReady returns true', () => {
    const mockCollectorSet = createUsageCollectionSetupMock();
    registerRollupUsageCollector(mockCollectorSet, mockIndex);
    const usageCollectorConfig = mockCollectorSet.makeUsageCollector.mock.calls[0][0];
    expect(usageCollectorConfig.isReady()).toBe(true);
  });
});
