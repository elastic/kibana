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
import seedrandom from 'seedrandom';
import { isDefined } from '@kbn/ml-is-defined';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';
import { AggregateQuery } from '@kbn/es-query';
import { type UseCancellableSearch } from '@kbn/ml-cancellable-search';
import { RANDOM_SAMPLER_PROBABILITIES } from '../../constants/random_sampler';
import type {
  DocumentCountStats,
  OverallStatsSearchStrategyParams,
} from '../../../../../common/types/field_stats';
import { getSafeESQLName, isESQLQuery } from './esql_utils';

const MINIMUM_RANDOM_SAMPLER_DOC_COUNT = 100000;
const DEFAULT_INITIAL_RANDOM_SAMPLER_PROBABILITY = 0.000001;

export const getESQLDocumentCountStats = async (
  runRequest: UseCancellableSearch['runRequest'],
  query: AggregateQuery,
  filter?: estypes.QueryDslQueryContainer,
  timeFieldName?: string,
  intervalMs?: number,
  searchOptions?: ISearchOptions
): Promise<{ documentCountStats?: DocumentCountStats; totalCount: number }> => {
  if (!isESQLQuery(query)) {
    throw Error(
      i18n.translate('xpack.dataVisualizer.esql.noQueryProvided', {
        defaultMessage: 'No ES|QL query provided',
      })
    );
  }
  const esqlBaseQuery = query.esql;
  let earliestMs = Infinity;
  let latestMs = -Infinity;

  if (timeFieldName) {
    const aggQuery = ` | EVAL _timestamp_= TO_DOUBLE(DATE_TRUNC(${intervalMs} millisecond, ${getSafeESQLName(
      timeFieldName
    )}))
    | stats rows = count(*) by _timestamp_
    | LIMIT 10000`;

    const esqlResults = await runRequest(
      {
        params: {
          query: esqlBaseQuery + aggQuery,
          ...(filter ? { filter } : {}),
        },
      },
      { ...(searchOptions ?? {}), strategy: 'esql' }
    );

    let totalCount = 0;
    const _buckets: Record<string, number> = {};
    // @ts-expect-error ES types needs to be updated with columns and values as part of esql response
    esqlResults?.rawResponse.values.forEach((val) => {
      const [count, bucket] = val;
      _buckets[bucket] = count;
      totalCount += count;
      if (bucket < earliestMs) {
        earliestMs = bucket;
      }
      if (bucket >= latestMs) {
        latestMs = bucket;
      }
    });
    const result: DocumentCountStats = {
      interval: intervalMs,
      probability: 1,
      randomlySampled: false,
      timeRangeEarliest: earliestMs,
      timeRangeLatest: latestMs,
      buckets: _buckets,
      totalCount,
    };
    return { documentCountStats: result, totalCount };
  } else {
    //  If not time field, get the total count
    const esqlResults = await runRequest(
      {
        params: {
          query: esqlBaseQuery + ' | STATS _count_ = COUNT(*)  | LIMIT 1',
        },
      },
      { ...(searchOptions ?? {}), strategy: 'esql' }
    );

    // @ts-expect-error ES types needs to be updated with columns and values as part of esql response
    return { documentCountStats: undefined, totalCount: esqlResults.rawResponse.values[0][0] };
  }
};
export const getDocumentCountStats = async (
  search: DataPublicPluginStart['search'],
  params: OverallStatsSearchStrategyParams,
  searchOptions: ISearchOptions,
  browserSessionSeed?: string,
  probability?: number | null,
  minimumRandomSamplerDocCount?: number
): Promise<DocumentCountStats> => {
  const seed = browserSessionSeed ?? Math.abs(seedrandom().int32()).toString();

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
        min_doc_count: 0,
        extended_bounds: {
          min: earliestMs,
          max: latestMs,
        },
      },
    },
  };

  // If probability is provided, use that
  // Else, make an initial query using very low p
  // so that we can calculate the next p value that's appropriate for the data set
  const initialDefaultProbability = probability ?? DEFAULT_INITIAL_RANDOM_SAMPLER_PROBABILITY;

  const getAggsWithRandomSampling = (p: number) => ({
    sampler: {
      aggs,
      random_sampler: {
        probability: p,
        seed,
      },
    },
  });

  const hasTimeField =
    timeFieldName !== undefined &&
    timeFieldName !== '' &&
    intervalMs !== undefined &&
    intervalMs > 0;

  const getSearchParams = (aggregations: unknown, trackTotalHits = false) => ({
    index,
    body: {
      query,
      ...(hasTimeField ? { aggs: aggregations } : {}),
      ...(isPopulatedObject(runtimeFieldMap) ? { runtime_mappings: runtimeFieldMap } : {}),
    },
    track_total_hits: trackTotalHits,
    size: 0,
  });
  const firstResp = await search
    .search(
      {
        params: getSearchParams(
          getAggsWithRandomSampling(initialDefaultProbability),
          // Track total hits if time field is not defined
          !hasTimeField
        ),
      },
      searchOptions
    )
    .toPromise();

  if (firstResp === undefined) {
    throw Error(
      `An error occurred with the following query ${JSON.stringify(
        getSearchParams(getAggsWithRandomSampling(initialDefaultProbability))
      )}`
    );
  }

  // If time field is not defined, no need to show the document count chart
  // Just need to return the tracked total hits
  if (!hasTimeField) {
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
  const numDocs = minimumRandomSamplerDocCount ?? MINIMUM_RANDOM_SAMPLER_DOC_COUNT;
  if (firstResp !== undefined && numSampled < numDocs) {
    const newProbability =
      (initialDefaultProbability * numDocs) / (numSampled - 2 * Math.sqrt(numSampled));

    // If the number of docs is < 3 million
    // proceed to make a vanilla aggregation without any sampling (probability = 1)
    // Minimum of 4 docs (3e6 * 0.000001 + 1) sampled gives us 90% confidence interval # docs is within
    if (newProbability === Infinity || numSampled <= 4) {
      const vanillaAggResp = await search
        .search(
          {
            params: getSearchParams(getAggsWithRandomSampling(1)),
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
            params: getSearchParams(getAggsWithRandomSampling(closestProbability)),
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
