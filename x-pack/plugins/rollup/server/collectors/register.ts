/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';

interface IdToFlagMap {
  [key: string]: boolean;
}

// elasticsearch index.max_result_window default value
const ES_MAX_RESULT_WINDOW_DEFAULT_VALUE = 1000;

function getIdFromSavedObjectId(savedObjectId: string) {
  // The saved object ID is formatted `{TYPE}:{ID}`.
  return savedObjectId.split(':')[1];
}

function createIdToFlagMap(ids: string[]) {
  return ids.reduce((map, id) => {
    map[id] = true;
    return map;
  }, {} as any);
}

async function fetchRollupIndexPatterns(kibanaIndex: string, callCluster: CallCluster) {
  const searchParams = {
    size: ES_MAX_RESULT_WINDOW_DEFAULT_VALUE,
    index: kibanaIndex,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id'],
    body: {
      query: {
        bool: {
          filter: {
            term: {
              'index-pattern.type': 'rollup',
            },
          },
        },
      },
    },
  };

  const esResponse = await callCluster('search', searchParams);

  return get(esResponse, 'hits.hits', []).map((indexPattern: any) => {
    const { _id: savedObjectId } = indexPattern;
    return getIdFromSavedObjectId(savedObjectId);
  });
}

async function fetchRollupSavedSearches(
  kibanaIndex: string,
  callCluster: CallCluster,
  rollupIndexPatternToFlagMap: IdToFlagMap
) {
  const searchParams = {
    size: ES_MAX_RESULT_WINDOW_DEFAULT_VALUE,
    index: kibanaIndex,
    ignoreUnavailable: true,
    filterPath: ['hits.hits._id', 'hits.hits._source.search.kibanaSavedObjectMeta'],
    body: {
      query: {
        bool: {
          filter: {
            term: {
              type: 'search',
            },
          },
        },
      },
    },
  };

  const esResponse = await callCluster('search', searchParams);
  const savedSearches = get(esResponse, 'hits.hits', []);

  // Filter for ones with rollup index patterns.
  return savedSearches.reduce((rollupSavedSearches: any, savedSearch: any) => {
    const {
      _id: savedObjectId,
      _source: {
        search: {
          kibanaSavedObjectMeta: { searchSourceJSON },
        },
      },
    } = savedSearch;

    const searchSource = JSON.parse(searchSourceJSON);

    if (rollupIndexPatternToFlagMap[searchSource.index]) {
      const id = getIdFromSavedObjectId(savedObjectId) as string;
      rollupSavedSearches.push(id);
    }

    return rollupSavedSearches;
  }, [] as string[]);
}

async function fetchRollupVisualizations(
  kibanaIndex: string,
  callCluster: CallCluster,
  rollupIndexPatternToFlagMap: IdToFlagMap,
  rollupSavedSearchesToFlagMap: IdToFlagMap
) {
  const searchParams = {
    size: ES_MAX_RESULT_WINDOW_DEFAULT_VALUE,
    index: kibanaIndex,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.visualization.savedSearchRefName',
      'hits.hits._source.visualization.kibanaSavedObjectMeta',
      'hits.hits._source.references',
    ],
    body: {
      query: {
        bool: {
          filter: {
            term: {
              type: 'visualization',
            },
          },
        },
      },
    },
  };

  const esResponse = await callCluster('search', searchParams);
  const visualizations = get(esResponse, 'hits.hits', []);

  let rollupVisualizations = 0;
  let rollupVisualizationsFromSavedSearches = 0;

  visualizations.forEach((visualization: any) => {
    const references: Array<{ name: string; id: string }> | undefined = get(
      visualization,
      '_source.references'
    );
    const savedSearchRefName: string | undefined = get(
      visualization,
      '_source.visualization.savedSearchRefName'
    );
    const searchSourceJSON: string | undefined = get(
      visualization,
      '_source.visualization.kibanaSavedObjectMeta.searchSourceJSON'
    );

    if (savedSearchRefName && references?.length) {
      // This visualization depends upon a saved search.
      const savedSearch = references.find(({ name }) => name === savedSearchRefName);
      if (savedSearch && rollupSavedSearchesToFlagMap[savedSearch.id]) {
        rollupVisualizations++;
        rollupVisualizationsFromSavedSearches++;
      }
    } else if (searchSourceJSON) {
      // This visualization depends upon an index pattern.
      const searchSource = JSON.parse(searchSourceJSON);

      if (rollupIndexPatternToFlagMap[searchSource.index]) {
        rollupVisualizations++;
      }
    }

    return rollupVisualizations;
  });

  return {
    rollupVisualizations,
    rollupVisualizationsFromSavedSearches,
  };
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
    saved_searches: {
      total: number;
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
        total: { type: 'long' },
      },
      saved_searches: {
        total: { type: 'long' },
      },
      visualizations: {
        saved_searches: {
          total: { type: 'long' },
        },
        total: { type: 'long' },
      },
    },
    fetch: async (callCluster: CallCluster) => {
      const rollupIndexPatterns = await fetchRollupIndexPatterns(kibanaIndex, callCluster);
      const rollupIndexPatternToFlagMap = createIdToFlagMap(rollupIndexPatterns);

      const rollupSavedSearches = await fetchRollupSavedSearches(
        kibanaIndex,
        callCluster,
        rollupIndexPatternToFlagMap
      );
      const rollupSavedSearchesToFlagMap = createIdToFlagMap(rollupSavedSearches);

      const {
        rollupVisualizations,
        rollupVisualizationsFromSavedSearches,
      } = await fetchRollupVisualizations(
        kibanaIndex,
        callCluster,
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
          saved_searches: {
            total: rollupVisualizationsFromSavedSearches,
          },
        },
      };
    },
  });

  usageCollection.registerCollector(collector);
}
