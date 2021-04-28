/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { UsageCollectionSetup, CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { ElasticsearchClient } from 'kibana/server';

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

async function fetchRollupIndexPatterns(kibanaIndex: string, esClient: ElasticsearchClient) {
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

  const { body: esResponse } = await esClient.search(searchParams);

  return get(esResponse, 'hits.hits', []).map((indexPattern: any) => {
    const { _id: savedObjectId } = indexPattern;
    return getIdFromSavedObjectId(savedObjectId);
  });
}

const getSavedObjectsList = async ({
  esClient,
  searchAfter,
  kibanaIndex,
  filterPath,
  filter,
}: {
  esClient: ElasticsearchClient;
  searchAfter: string[] | undefined;
  kibanaIndex: string;
  filterPath: string[];
  filter: any;
}) => {
  const { body: esResponse } = await esClient.search({
    body: {
      search_after: searchAfter,
      sort: [{ updated_at: 'asc' }],
      query: {
        bool: {
          filter,
        },
      },
    },
    ignore_unavailable: true,
    index: kibanaIndex,
    size: ES_MAX_RESULT_WINDOW_DEFAULT_VALUE,
    // @ts-expect-error@elastic/elasticsearch _source does not exist in type SearchRequest
    _source: filterPath,
  });
  return esResponse;
};

async function fetchRollupSavedSearches(
  kibanaIndex: string,
  esClient: ElasticsearchClient,
  rollupIndexPatternToFlagMap: IdToFlagMap
) {
  const searchProps = {
    esClient,
    kibanaIndex,
    searchAfter: undefined,
    filterPath: ['references'],
    filter: {
      term: {
        type: 'search',
      },
    },
  };
  let savedSearchesList = await getSavedObjectsList(searchProps);

  const rollupSavedSearches: string[] = [];

  while (savedSearchesList.hits.hits.length !== 0) {
    const savedSearches = get(savedSearchesList, 'hits.hits', []);
    savedSearches.map(async (savedSearch: any) => {
      const { _id: savedObjectId } = savedSearch;
      const references: Array<{ name: string; id: string; type: string }> | undefined = get(
        savedSearch,
        '_source.references'
      );

      if (references?.length) {
        const visualizationsFromPatterns = references.filter(
          ({ type, id }) => type === 'index-pattern' && rollupIndexPatternToFlagMap[id]
        );
        if (visualizationsFromPatterns.length) {
          const id = getIdFromSavedObjectId(savedObjectId) as string;
          rollupSavedSearches.push(id);
        }
      }
    }, [] as string[]);

    savedSearchesList = await getSavedObjectsList({
      ...searchProps,
      // @ts-expect-error@elastic/elasticsearch SortResults might contain null
      searchAfter: savedSearchesList.hits.hits[savedSearchesList.hits.hits.length - 1].sort,
    });
  }
  return rollupSavedSearches;
}

async function fetchRollupVisualizations(
  kibanaIndex: string,
  esClient: ElasticsearchClient,
  rollupIndexPatternToFlagMap: IdToFlagMap,
  rollupSavedSearchesToFlagMap: IdToFlagMap
) {
  let rollupVisualizations = 0;
  let rollupLensVisualizations = 0;
  let rollupVisualizationsFromSavedSearches = 0;
  let rollupLensVisualizationsFromSavedSearches = 0;

  const searchProps = {
    esClient,
    kibanaIndex,
    searchAfter: undefined,
    filterPath: ['type', 'references'],
    filter: {
      terms: {
        type: ['visualization', 'lens'],
      },
    },
  };

  let savedVisualizationsList = await getSavedObjectsList(searchProps);

  while (savedVisualizationsList.hits.hits.length !== 0) {
    const visualizations = get(savedVisualizationsList, 'hits.hits', []);
    const sort =
      savedVisualizationsList.hits.hits[savedVisualizationsList.hits.hits.length - 1].sort;
    visualizations.forEach(async (visualization: any) => {
      const references: Array<{ name: string; id: string; type: string }> | undefined = get(
        visualization,
        '_source.references'
      );

      if (references?.length) {
        const visualizationsFromPatterns = references.filter(
          ({ type, id }) => type === 'index-pattern' && rollupIndexPatternToFlagMap[id]
        );
        const visualizationsFromSavedSearches = references.filter(
          ({ type, id }) => type === 'search' && rollupSavedSearchesToFlagMap[id]
        );
        if (visualizationsFromPatterns.length) {
          rollupVisualizations++;
          if (visualization._source.type === 'lens') {
            rollupLensVisualizations++;
          }
        } else if (visualizationsFromSavedSearches.length) {
          rollupVisualizationsFromSavedSearches++;
          if (visualization._source.type === 'lens') {
            rollupLensVisualizationsFromSavedSearches++;
          }
        }
      }
    }, [] as string[]);
    savedVisualizationsList = await getSavedObjectsList({
      ...searchProps,
      // @ts-expect-error@elastic/elasticsearch SortResults might contain null
      searchAfter: sort,
    });
  }

  return {
    rollupVisualizations,
    rollupVisualizationsFromSavedSearches,
    rollupLensVisualizations,
    rollupLensVisualizationsFromSavedSearches,
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
        total: { type: 'long' },
      },
      saved_searches: {
        total: { type: 'long' },
      },
      visualizations: {
        saved_searches: {
          total: { type: 'long' },
          lens_total: { type: 'long' },
        },
        total: { type: 'long' },
        lens_total: { type: 'long' },
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
