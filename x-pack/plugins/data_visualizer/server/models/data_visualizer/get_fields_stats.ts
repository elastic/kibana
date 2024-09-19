/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { each, find, get } from 'lodash';
import { IScopedClusterClient } from 'kibana/server';
import {
  Aggs,
  BooleanFieldStats,
  Bucket,
  DateFieldStats,
  DocumentCountStats,
  Field,
  NumericFieldStats,
  StringFieldStats,
} from '../../types';
import {
  buildBaseFilterCriteria,
  buildSamplerAggregation,
  getSafeAggregationName,
  getSamplerAggregationsResponsePath,
} from '../../../common/utils/query_utils';
import { isPopulatedObject } from '../../../common/utils/object_utils';
import { processDistributionData } from './process_distribution_data';
import { SAMPLER_TOP_TERMS_SHARD_SIZE, SAMPLER_TOP_TERMS_THRESHOLD } from './constants';

export const getDocumentCountStats = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  intervalMs: number,
  runtimeMappings: estypes.MappingRuntimeFields
): Promise<DocumentCountStats> => {
  const { asCurrentUser } = client;

  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

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
    aggs,
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });

  const buckets: { [key: string]: number } = {};
  const dataByTimeBucket: Array<{ key: string; doc_count: number }> = get(
    body,
    ['aggregations', 'eventRate', 'buckets'],
    []
  );
  each(dataByTimeBucket, (dataForTime) => {
    const time = dataForTime.key;
    buckets[time] = dataForTime.doc_count;
  });

  return {
    documentCounts: {
      interval: intervalMs,
      buckets,
    },
  };
};

export const getNumericFieldsStats = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: object,
  fields: Field[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;
  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  // Build the percents parameter which defines the percentiles to query
  // for the metric distribution data.
  // Use a fixed percentile spacing of 5%.
  const MAX_PERCENT = 100;
  const PERCENTILE_SPACING = 5;
  let count = 0;
  const percents = Array.from(
    Array(MAX_PERCENT / PERCENTILE_SPACING),
    () => (count += PERCENTILE_SPACING)
  );

  const aggs: { [key: string]: any } = {};
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    aggs[`${safeFieldName}_field_stats`] = {
      filter: { exists: { field: field.fieldName } },
      aggs: {
        actual_stats: {
          stats: { field: field.fieldName },
        },
      },
    };
    aggs[`${safeFieldName}_percentiles`] = {
      percentiles: {
        field: field.fieldName,
        percents,
        keyed: false,
      },
    };

    const top = {
      terms: {
        field: field.fieldName,
        size: 10,
        order: {
          _count: 'desc',
        },
      },
    };

    // If cardinality >= SAMPLE_TOP_TERMS_THRESHOLD, run the top terms aggregation
    // in a sampler aggregation, even if no sampling has been specified (samplerShardSize < 1).
    if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
      aggs[`${safeFieldName}_top`] = {
        sampler: {
          shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE,
        },
        aggs: {
          top,
        },
      };
    } else {
      aggs[`${safeFieldName}_top`] = top;
    }
  });

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const batchStats: NumericFieldStats[] = [];
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    const docCount = get(
      aggregations,
      [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
      0
    );
    const fieldStatsResp = get(
      aggregations,
      [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
      {}
    );

    const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
    if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
      topAggsPath.push('top');
    }

    const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

    const stats: NumericFieldStats = {
      fieldName: field.fieldName,
      count: docCount,
      min: get(fieldStatsResp, 'min', 0),
      max: get(fieldStatsResp, 'max', 0),
      avg: get(fieldStatsResp, 'avg', 0),
      isTopValuesSampled: field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD || samplerShardSize > 0,
      topValues,
      topValuesSampleSize: topValues.reduce(
        (acc, curr) => acc + curr.doc_count,
        get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
      ),
      topValuesSamplerShardSize:
        field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD
          ? SAMPLER_TOP_TERMS_SHARD_SIZE
          : samplerShardSize,
    };

    if (stats.count > 0) {
      const percentiles = get(
        aggregations,
        [...aggsPath, `${safeFieldName}_percentiles`, 'values'],
        []
      );
      const medianPercentile: { value: number; key: number } | undefined = find(percentiles, {
        key: 50,
      });
      stats.median = medianPercentile !== undefined ? medianPercentile!.value : 0;
      stats.distribution = processDistributionData(percentiles, PERCENTILE_SPACING, stats.min);
    }

    batchStats.push(stats);
  });

  return batchStats;
};

export const getStringFieldsStats = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: object,
  fields: Field[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;

  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    const top = {
      terms: {
        field: field.fieldName,
        size: 10,
        order: {
          _count: 'desc',
        },
      },
    };

    // If cardinality >= SAMPLE_TOP_TERMS_THRESHOLD, run the top terms aggregation
    // in a sampler aggregation, even if no sampling has been specified (samplerShardSize < 1).
    if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
      aggs[`${safeFieldName}_top`] = {
        sampler: {
          shard_size: SAMPLER_TOP_TERMS_SHARD_SIZE,
        },
        aggs: {
          top,
        },
      };
    } else {
      aggs[`${safeFieldName}_top`] = top;
    }
  });

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const batchStats: StringFieldStats[] = [];
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);

    const topAggsPath = [...aggsPath, `${safeFieldName}_top`];
    if (samplerShardSize < 1 && field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD) {
      topAggsPath.push('top');
    }

    const topValues: Bucket[] = get(aggregations, [...topAggsPath, 'buckets'], []);

    const stats = {
      fieldName: field.fieldName,
      isTopValuesSampled: field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD || samplerShardSize > 0,
      topValues,
      topValuesSampleSize: topValues.reduce(
        (acc, curr) => acc + curr.doc_count,
        get(aggregations, [...topAggsPath, 'sum_other_doc_count'], 0)
      ),
      topValuesSamplerShardSize:
        field.cardinality >= SAMPLER_TOP_TERMS_THRESHOLD
          ? SAMPLER_TOP_TERMS_SHARD_SIZE
          : samplerShardSize,
    };

    batchStats.push(stats);
  });

  return batchStats;
};

export const getDateFieldsStats = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: object,
  fields: Field[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;

  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    aggs[`${safeFieldName}_field_stats`] = {
      filter: { exists: { field: field.fieldName } },
      aggs: {
        actual_stats: {
          stats: { field: field.fieldName },
        },
      },
    };
  });

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const batchStats: DateFieldStats[] = [];
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    const docCount = get(
      aggregations,
      [...aggsPath, `${safeFieldName}_field_stats`, 'doc_count'],
      0
    );
    const fieldStatsResp = get(
      aggregations,
      [...aggsPath, `${safeFieldName}_field_stats`, 'actual_stats'],
      {}
    );
    batchStats.push({
      fieldName: field.fieldName,
      count: docCount,
      earliest: get(fieldStatsResp, 'min', 0),
      latest: get(fieldStatsResp, 'max', 0),
    });
  });

  return batchStats;
};

export const getBooleanFieldsStats = async (
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: object,
  fields: Field[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings?: estypes.MappingRuntimeFields
) => {
  const { asCurrentUser } = client;

  const index = indexPatternTitle;
  const size = 0;
  const filterCriteria = buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query);

  const aggs: Aggs = {};
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    aggs[`${safeFieldName}_value_count`] = {
      filter: { exists: { field: field.fieldName } },
    };
    aggs[`${safeFieldName}_values`] = {
      terms: {
        field: field.fieldName,
        size: 2,
      },
    };
  });

  const searchBody = {
    query: {
      bool: {
        filter: filterCriteria,
      },
    },
    aggs: buildSamplerAggregation(aggs, samplerShardSize),
    ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
  };

  const { body } = await asCurrentUser.search({
    index,
    size,
    body: searchBody,
  });
  const aggregations = body.aggregations;
  const aggsPath = getSamplerAggregationsResponsePath(samplerShardSize);
  const batchStats: BooleanFieldStats[] = [];
  fields.forEach((field, i) => {
    const safeFieldName = getSafeAggregationName(field.fieldName, i);
    const stats: BooleanFieldStats = {
      fieldName: field.fieldName,
      count: get(aggregations, [...aggsPath, `${safeFieldName}_value_count`, 'doc_count'], 0),
      trueCount: 0,
      falseCount: 0,
    };

    const valueBuckets: Array<{ [key: string]: number }> = get(
      aggregations,
      [...aggsPath, `${safeFieldName}_values`, 'buckets'],
      []
    );
    valueBuckets.forEach((bucket) => {
      stats[`${bucket.key_as_string}Count`] = bucket.doc_count;
    });

    batchStats.push(stats);
  });

  return batchStats;
};
