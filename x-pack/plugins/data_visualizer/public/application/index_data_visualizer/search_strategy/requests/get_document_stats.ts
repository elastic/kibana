/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, get, sortedIndex, first } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { DataPublicPluginStart, ISearchOptions } from '@kbn/data-plugin/public';
import seedrandom from 'seedrandom';
import { isDefined } from '../../../common/util/is_defined';
import { RANDOM_SAMPLER_PROBABILITIES } from '../../constants/random_sampler';
import { buildBaseFilterCriteria } from '../../../../../common/utils/query_utils';
import type {
  DocumentCountStats,
  OverallStatsSearchStrategyParams,
} from '../../../../../common/types/field_stats';

// We want to only use random sampler if dataset contains more than 10.9m docs
// For a query which matches 9M docs we have "hit count" ~ Binomial(9000000, 0.00001) ~ Normal(90, 90)
// So the chance that the hit count exceeds 90 + 2 * sqrt(90), i.e. 2 sd, is around 1%.
const MINIMUM_RANDOM_SAMPLER_SAMPLED_DOCS = 109;

// The desired minimum threshold of randomly sampled documents for which the result is more meaningful
const DESIRED_MINIMUM_RANDOM_SAMPLER_DOC_COUNT = 100000;

const MINIMUM_RANDOM_SAMPLER_DOC_COUNT = 100000;
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

export const getDocumentCountStats = async (
  search: DataPublicPluginStart['search'],
  params: OverallStatsSearchStrategyParams,
  searchOptions: ISearchOptions,
  browserSessionSeed: number,
  probability?: number | null,
  minimumRandomSamplerDocCount?: number
): Promise<DocumentCountStats> => {
  const seed = browserSessionSeed ?? Math.abs(seedrandom().int32());

  const {
    index,
    timeFieldName,
    earliest: earliestMs,
    latest: latestMs,
    runtimeFieldMap,
    searchQuery,
    intervalMs,
  } = params;

  // Probability = 1 represents no sampling
  const result = { randomlySampled: false, took: 0, totalCount: 0, probability: 1 };

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

  // If probability is provided, use that
  // Else, make an initial query using very low p
  // so that we can calculate the next p value that's appropriate for the data set
  const initialDefaultProbability = probability ?? 1e-5;

  const getEventRateAggsWithRandomSampling = (p: number) => ({
    sampler: {
      aggs,
      random_sampler: {
        probability: p,
        seed,
      },
    },
  });

  const hasTimeField = timeFieldName !== undefined && intervalMs !== undefined && intervalMs > 0;

  const getSearchParams = (aggregations: unknown) => ({
    index,
    body: {
      query,
      ...(aggregations !== undefined ? { aggs: aggregations } : {}),
      ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
    },
    track_total_hits: !hasTimeField,
    size: 0,
  });

  const firstResp = await search
    .search(
      {
        params: getSearchParams(
          getAggsWithRandomSampling(initialDefaultProbability),
          // Track total hits if time field is not defined
          timeFieldName === undefined
        ),
      },
      searchOptions
    )
    .toPromise();

  if (firstResp === undefined) {
    throw Error(
      `An error occurred with the following query ${JSON.stringify(
        getSearchParams(getEventRateAggsWithRandomSampling(initialDefaultProbability))
      )}`
    );
  }

  // If time field is not defined, no need to show the document count chart
  // Just need to return the tracked total hits
  if (timeFieldName === undefined) {
    const trackedTotalHits =
      typeof firstResp.rawResponse.hits.total === 'number'
        ? firstResp.rawResponse.hits.total
        : firstResp.rawResponse.hits.total?.value;
    return {
      ...result,
      randomlySampled: false,
      took: firstResp.rawResponse.took,
      totalCount: trackedTotalHits ?? 0,
    };
  }


  if (isDefined(probability)) {
    return {
      ...result,
      randomlySampled: probability === 1 ? false : true,
      took: firstResp.rawResponse?.took,
      probability,
      ...processDocumentCountStats(firstResp.rawResponse, params, true),
    };
  }

  // @ts-expect-error ES types needs to be updated with doc_count as part random sampler aggregation
  const numSampled = firstResp.rawResponse.aggregations?.sampler?.doc_count;
  const numDocs = minimumRandomSamplerDocCount ?? DESIRED_MINIMUM_RANDOM_SAMPLER_DOC_COUNT;
  if (firstResp !== undefined) {
    const newProbability =
      (initialDefaultProbability * numDocs) / (numSampled - 2 * Math.sqrt(numSampled));

    if (!hasTimeField) {
      return {
        ...result,
        took: firstResp.rawResponse.took,
        totalCount:
          (typeof firstResp.rawResponse.hits?.total === 'number'
            ? firstResp.rawResponse.hits?.total
            : firstResp.rawResponse.hits?.total?.value) ?? 0,
        probability: numSampled < MINIMUM_RANDOM_SAMPLER_SAMPLED_DOCS ? 1 : newProbability,
      };
    }

    // If the number of docs sampled is indicative of query results with < 10.9 million docs
    // proceed to make a vanilla aggregation without any sampling
    if (
      numSampled === 0 ||
      newProbability === Infinity ||
      numSampled < MINIMUM_RANDOM_SAMPLER_SAMPLED_DOCS
    ) {
      const vanillaAggResp = await search
        .search(
          {
            params: getSearchParams(getEventRateAggsWithRandomSampling(1)),
          },
          searchOptions
        )
        .toPromise();

      return {
        ...result,
        randomlySampled: false,
        took: firstResp.rawResponse.took + (vanillaAggResp?.rawResponse?.took ?? 0),
        ...processDocumentCountStats(vanillaAggResp?.rawResponse, params, true),
        probability: 1,
      };
    } else {
      // Else, make second random sampler
      const closestProbability =
        RANDOM_SAMPLER_PROBABILITIES[sortedIndex(RANDOM_SAMPLER_PROBABILITIES, newProbability)];
      const secondResp = await search
        .search(
          {
            params: getSearchParams(getEventRateAggsWithRandomSampling(closestProbability)),
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
): Omit<DocumentCountStats, 'probability'> | undefined => {
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
