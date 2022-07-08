/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get, sortedIndex } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { DataPublicPluginStart, ISearchOptions } from '@kbn/data-plugin/public';
import { firstValueFrom } from 'rxjs';
import seedrandom from 'seedrandom';
import { buildBaseFilterCriteria } from '../../../../../common/utils/query_utils';
import type {
  DocumentCountStats,
  OverallStatsSearchStrategyParams,
} from '../../../../../common/types/field_stats';
const fidelities = [
  1.0, 0.5, 0.25, 0.1, 0.05, 0.025, 0.01, 0.005, 0.0025, 0.001, 0.0005, 0.00025, 0.0001, 0.00005,
  0.000025, 0.00001, 0.000005, 0.0000025, 0.000001,
].reverse();

// @TODO: move this to user/browser session
// Create a unique `seed` for browser session - To give repeatable results, the seed should be set based on the user's browser session
const seed = Math.abs(seedrandom().int32());

export const getDocumentCountStatsRequest = (params: OverallStatsSearchStrategyParams) => {
  const {
    index,
    timeFieldName,
    earliest: earliestMs,
    latest: latestMs,
    runtimeFieldMap,
    searchQuery,
    intervalMs,
    fieldsToFetch,
  } = params;

  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, searchQuery);

  // Don't use the sampler aggregation as this can lead to some potentially
  // confusing date histogram results depending on the date range of data amongst shards.
  const aggs = {
    eventRate: {
      date_histogram: {
        field: timeFieldName,
        fixed_interval: `${intervalMs}ms`,
        min_doc_count: 1,
      },
    },
  };

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    ...(!fieldsToFetch && timeFieldName !== undefined && intervalMs !== undefined && intervalMs > 0
      ? { aggs }
      : {}),
    ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
    track_total_hits: true,
    size,
  };
  return {
    index,
    body: searchBody,
  };
};

interface DocumentStats extends DocumentCountStats {
  randomlySampled: boolean;
  took: number;
  totalCount: number;
  probability?: number;
}

export const getDocumentCountStats = async (
  search: DataPublicPluginStart['search'],
  params: OverallStatsSearchStrategyParams,
  searchOptions: ISearchOptions
): Promise<DocumentStats> => {
  const {
    index,
    timeFieldName,
    earliest: earliestMs,
    latest: latestMs,
    runtimeFieldMap,
    searchQuery,
    intervalMs,
    fieldsToFetch,
  } = params;

  let result = { randomlySampled: false, took: 0, totalCount: 0 };
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, searchQuery);

  const query = {
    bool: {
      filter: filterCriteria,
    },
  };
  // Don't use the sampler aggregation as this can lead to some potentially
  // confusing date histogram results depending on the date range of data amongst shards.
  const aggs = {
    eventRate: {
      date_histogram: {
        field: timeFieldName,
        fixed_interval: `${intervalMs}ms`,
        min_doc_count: 1,
      },
    },
  };

  // First make a query with very low probability
  const probability = 0.00001;

  const aggsWithRandomSampling = (p: number) => ({
    sampler: {
      aggs,
      random_sampler: {
        probability: p,
        seed,
      },
    },
  });

  const firstResp = await firstValueFrom(
    search.search(
      {
        params: {
          index,
          body: {
            query,
            ...(!fieldsToFetch &&
            timeFieldName !== undefined &&
            intervalMs !== undefined &&
            intervalMs > 0
              ? { aggs: aggsWithRandomSampling(0.000001) } // @todo: correct to 0.000001
              : {}),
            ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
          },
          track_total_hits: false,
          size: 0,
        },
      },
      searchOptions
    )
  );

  // @ts-expect-error ES types needs to be updated with doc_count as part random sampler aggregation
  const numSampled = firstResp.rawResponse.aggregations?.sampler?.doc_count;
  const numDocs = 100000;
  if (numSampled < numDocs) {
    const newProbability = (probability * numDocs) / (numSampled - 2 * Math.sqrt(numSampled));

    // @todo: if newProbability < 0
    if (numSampled === 0 || newProbability === Infinity) {
      const vanillaAggResp = await firstValueFrom(
        search.search(
          {
            params: {
              index,
              body: {
                query,
                ...(!fieldsToFetch &&
                timeFieldName !== undefined &&
                intervalMs !== undefined &&
                intervalMs > 0
                  ? { aggs }
                  : {}),
                ...(isPopulatedObject(runtimeFieldMap)
                  ? { runtime_mappings: runtimeFieldMap }
                  : {}),
              },
              track_total_hits: true,
              size: 0,
            },
          },
          searchOptions
        )
      );
      result = {
        ...result,
        randomlySampled: false,
        took: firstResp.rawResponse.took + vanillaAggResp.rawResponse.took,
        ...processDocumentCountStats(vanillaAggResp.rawResponse, params, false),
      };
    } else {
      // Else, make second random sampler
      const closestProbability = fidelities[sortedIndex(fidelities, newProbability)];
      const secondResp = await search
        .search(
          {
            params: {
              index,
              body: {
                query,
                ...(!fieldsToFetch &&
                timeFieldName !== undefined &&
                intervalMs !== undefined &&
                intervalMs > 0
                  ? { aggs: aggsWithRandomSampling(closestProbability) }
                  : {}),
                ...(isPopulatedObject(runtimeFieldMap)
                  ? { runtime_mappings: runtimeFieldMap }
                  : {}),
                size: 0,
                track_total_hits: false,
              },
              track_total_hits: false,
              size: 0,
            },
          },
          searchOptions
        )
        .toPromise();
      if (secondResp) {
        return {
          ...result,
          randomlySampled: true,
          took: firstResp.rawResponse.took + secondResp.rawResponse.took,
          ...processDocumentCountStats(secondResp.rawResponse, params, true),
          probability: closestProbability,
        };
      }
    }
  }
  return result;
};

export const processDocumentCountStats = (
  body: estypes.SearchResponse | undefined,
  params: OverallStatsSearchStrategyParams,
  randomlySampled = false
): DocumentCountStats | undefined => {
  if (!body) return undefined;

  let totalCount = 0;

  if (
    params.intervalMs === undefined ||
    params.earliest === undefined ||
    params.latest === undefined
  ) {
    return {
      totalCount,
    };
  }
  const buckets: { [key: string]: number } = {};
  const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
    body,
    randomlySampled
      ? ['aggregations', 'sampler', 'eventRate', 'buckets']
      : ['aggregations', 'eventRate', 'buckets'],
    []
  );
  each(dataByTimeBucket, (dataForTime) => {
    const time = dataForTime.key;
    buckets[time] = dataForTime.doc_count;
    totalCount += dataForTime.doc_count;
  });

  return {
    interval: params.intervalMs,
    buckets,
    timeRangeEarliest: params.earliest,
    timeRangeLatest: params.latest,
    totalCount,
  };
};
