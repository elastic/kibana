/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup, CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import {
  fetchRollupIndexPatterns,
  fetchRollupSavedSearches,
  fetchRollupVisualizations,
} from './helpers';

function createIdToFlagMap(ids: string[]) {
  return ids.reduce((map, id) => {
    map[id] = true;
    return map;
  }, {} as any);
}

interface Usage {
  index_patterns: {
    total: number;
  };
  saved_searches: {
    total: number;
  };
  visualizations: {
    total: number;
    lens_total: number;
    saved_searches: {
      total: number;
      lens_total: number;
    };
  };
}

export function registerRollupUsageCollector(
  usageCollection: UsageCollectionSetup,
  kibanaIndex: string
): void {
  const collector = usageCollection.makeUsageCollector<Usage>({
    type: 'rollups',
    isReady: () => true,
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
              description: 'Counts all the visualizations that are based on rollup saved searches',
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
    fetch: async ({ esClient }: CollectorFetchContext) => {
      const rollupIndexPatterns = await fetchRollupIndexPatterns(kibanaIndex, esClient);
      const rollupIndexPatternToFlagMap = createIdToFlagMap(rollupIndexPatterns);

      const rollupSavedSearches = await fetchRollupSavedSearches(
        kibanaIndex,
        esClient,
        rollupIndexPatternToFlagMap
      );
      const rollupSavedSearchesToFlagMap = createIdToFlagMap(rollupSavedSearches);

      const {
        rollupVisualizations,
        rollupVisualizationsFromSavedSearches,
        rollupLensVisualizations,
        rollupLensVisualizationsFromSavedSearches,
      } = await fetchRollupVisualizations(
        kibanaIndex,
        esClient,
        rollupIndexPatternToFlagMap,
        rollupSavedSearchesToFlagMap
      );

      return {
        index_patterns: {
          total: rollupIndexPatterns.length,
        },
        saved_searches: {
          total: rollupSavedSearches.length,
        },
        visualizations: {
          total: rollupVisualizations,
          lens_total: rollupLensVisualizations,
          saved_searches: {
            total: rollupVisualizationsFromSavedSearches,
            lens_total: rollupLensVisualizationsFromSavedSearches,
          },
        },
      };
    },
  });

  usageCollection.registerCollector(collector);
}
