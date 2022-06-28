/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  CategoriesSort,
  compareDatasetsByMaximumAnomalyScore,
  getJobId,
  jobCustomSettingsRT,
  logEntryCategoriesJobTypes,
} from '../../../common/log_analysis';
import { LogEntryContext } from '../../../common/log_entry';
import { ResolvedLogView } from '../../../common/log_views';
import { startTracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { MlAnomalyDetectors, MlSystem } from '../../types';
import { fetchMlJob, getLogEntryDatasets } from './common';
import { InsufficientLogAnalysisMlJobConfigurationError, UnknownCategoryError } from './errors';
import {
  createLogEntryCategoriesQuery,
  logEntryCategoriesResponseRT,
  LogEntryCategoryHit,
} from './queries/log_entry_categories';
import {
  createLogEntryCategoryExamplesQuery,
  LogEntryCategoryExampleHit,
  logEntryCategoryExamplesResponseRT,
} from './queries/log_entry_category_examples';
import {
  createLogEntryCategoryHistogramsQuery,
  logEntryCategoryHistogramsResponseRT,
} from './queries/log_entry_category_histograms';
import {
  createTopLogEntryCategoriesQuery,
  topLogEntryCategoriesResponseRT,
} from './queries/top_log_entry_categories';

export async function getTopLogEntryCategories(
  context: {
    infra: {
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number,
  categoryCount: number,
  datasets: string[],
  histograms: HistogramParameters[],
  sort: CategoriesSort
) {
  const finalizeTopLogEntryCategoriesSpan = startTracingSpan('get top categories');

  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  const {
    topLogEntryCategories,
    timing: { spans: fetchTopLogEntryCategoriesAggSpans },
  } = await fetchTopLogEntryCategories(
    context,
    logEntryCategoriesCountJobId,
    startTime,
    endTime,
    categoryCount,
    datasets,
    sort
  );

  const categoryIds = topLogEntryCategories.map(({ categoryId }) => categoryId);

  const {
    logEntryCategoriesById,
    timing: { spans: fetchTopLogEntryCategoryPatternsSpans },
  } = await fetchLogEntryCategories(context, logEntryCategoriesCountJobId, categoryIds);

  const {
    categoryHistogramsById,
    timing: { spans: fetchTopLogEntryCategoryHistogramsSpans },
  } = await fetchTopLogEntryCategoryHistograms(
    context,
    logEntryCategoriesCountJobId,
    categoryIds,
    histograms
  );

  const topLogEntryCategoriesSpan = finalizeTopLogEntryCategoriesSpan();

  return {
    data: topLogEntryCategories.map((topCategory) => ({
      ...topCategory,
      regularExpression: logEntryCategoriesById[topCategory.categoryId]?._source.regex ?? '',
      histograms: categoryHistogramsById[topCategory.categoryId] ?? [],
    })),
    timing: {
      spans: [
        topLogEntryCategoriesSpan,
        ...fetchTopLogEntryCategoriesAggSpans,
        ...fetchTopLogEntryCategoryPatternsSpans,
        ...fetchTopLogEntryCategoryHistogramsSpans,
      ],
    },
  };
}

export async function getLogEntryCategoryDatasets(
  context: {
    infra: {
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number
) {
  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  const jobIds = [logEntryCategoriesCountJobId];

  return await getLogEntryDatasets(context.infra.mlSystem, startTime, endTime, jobIds);
}

export async function getLogEntryCategoryExamples(
  context: {
    core: { elasticsearch: { client: { asCurrentUser: ElasticsearchClient } } };
    infra: {
      mlAnomalyDetectors: MlAnomalyDetectors;
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number,
  categoryId: number,
  exampleCount: number,
  resolvedLogView: ResolvedLogView
) {
  const finalizeLogEntryCategoryExamplesSpan = startTracingSpan('get category example log entries');

  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  const {
    mlJob,
    timing: { spans: fetchMlJobSpans },
  } = await fetchMlJob(context.infra.mlAnomalyDetectors, logEntryCategoriesCountJobId);

  const customSettings = decodeOrThrow(jobCustomSettingsRT)(mlJob.custom_settings);
  const indices = customSettings?.logs_source_config?.indexPattern;
  const timestampField = customSettings?.logs_source_config?.timestampField;
  const { tiebreakerField, runtimeMappings } = resolvedLogView;

  if (indices == null || timestampField == null) {
    throw new InsufficientLogAnalysisMlJobConfigurationError(
      `Failed to find index configuration for ml job ${logEntryCategoriesCountJobId}`
    );
  }

  const {
    logEntryCategoriesById,
    timing: { spans: fetchLogEntryCategoriesSpans },
  } = await fetchLogEntryCategories(context, logEntryCategoriesCountJobId, [categoryId]);
  const category = logEntryCategoriesById[categoryId];

  if (category == null) {
    throw new UnknownCategoryError(categoryId);
  }

  const {
    examples,
    timing: { spans: fetchLogEntryCategoryExamplesSpans },
  } = await fetchLogEntryCategoryExamples(
    context,
    indices,
    runtimeMappings,
    timestampField,
    tiebreakerField,
    startTime,
    endTime,
    category._source.terms,
    exampleCount
  );

  const logEntryCategoryExamplesSpan = finalizeLogEntryCategoryExamplesSpan();

  return {
    data: examples,
    timing: {
      spans: [
        logEntryCategoryExamplesSpan,
        ...fetchMlJobSpans,
        ...fetchLogEntryCategoriesSpans,
        ...fetchLogEntryCategoryExamplesSpans,
      ],
    },
  };
}

async function fetchTopLogEntryCategories(
  context: { infra: { mlSystem: MlSystem } },
  logEntryCategoriesCountJobId: string,
  startTime: number,
  endTime: number,
  categoryCount: number,
  datasets: string[],
  sort: CategoriesSort
) {
  const finalizeEsSearchSpan = startTracingSpan('Fetch top categories from ES');

  const topLogEntryCategoriesResponse = decodeOrThrow(topLogEntryCategoriesResponseRT)(
    await context.infra.mlSystem.mlAnomalySearch(
      createTopLogEntryCategoriesQuery(
        logEntryCategoriesCountJobId,
        startTime,
        endTime,
        categoryCount,
        datasets,
        sort
      ),
      [logEntryCategoriesCountJobId]
    )
  );

  const esSearchSpan = finalizeEsSearchSpan();

  const topLogEntryCategories =
    topLogEntryCategoriesResponse.aggregations?.terms_category_id.buckets.map(
      (topCategoryBucket) => {
        const maximumAnomalyScoresByDataset =
          topCategoryBucket.filter_record.terms_dataset.buckets.reduce<Record<string, number>>(
            (accumulatedMaximumAnomalyScores, datasetFromRecord) => ({
              ...accumulatedMaximumAnomalyScores,
              [datasetFromRecord.key]: datasetFromRecord.maximum_record_score.value ?? 0,
            }),
            {}
          );

        return {
          categoryId: parseCategoryId(topCategoryBucket.key),
          logEntryCount: topCategoryBucket.filter_model_plot.sum_actual.value ?? 0,
          datasets: topCategoryBucket.filter_model_plot.terms_dataset.buckets
            .map((datasetBucket) => ({
              name: datasetBucket.key,
              maximumAnomalyScore: maximumAnomalyScoresByDataset[datasetBucket.key] ?? 0,
            }))
            .sort(compareDatasetsByMaximumAnomalyScore)
            .reverse(),
          maximumAnomalyScore: topCategoryBucket.filter_record.maximum_record_score.value ?? 0,
        };
      }
    ) ?? [];

  return {
    topLogEntryCategories,
    timing: {
      spans: [esSearchSpan],
    },
  };
}

export async function fetchLogEntryCategories(
  context: { infra: { mlSystem: MlSystem } },
  logEntryCategoriesCountJobId: string,
  categoryIds: number[]
) {
  if (categoryIds.length === 0) {
    return {
      logEntryCategoriesById: {},
      timing: { spans: [] },
    };
  }

  const finalizeEsSearchSpan = startTracingSpan('Fetch category patterns from ES');

  const logEntryCategoriesResponse = decodeOrThrow(logEntryCategoriesResponseRT)(
    await context.infra.mlSystem.mlAnomalySearch(
      createLogEntryCategoriesQuery(logEntryCategoriesCountJobId, categoryIds),
      [logEntryCategoriesCountJobId]
    )
  );

  const esSearchSpan = finalizeEsSearchSpan();

  const logEntryCategoriesById = logEntryCategoriesResponse.hits.hits.reduce<
    Record<number, LogEntryCategoryHit>
  >(
    (accumulatedCategoriesById, categoryHit) => ({
      ...accumulatedCategoriesById,
      [categoryHit._source.category_id]: categoryHit,
    }),
    {}
  );

  return {
    logEntryCategoriesById,
    timing: {
      spans: [esSearchSpan],
    },
  };
}

async function fetchTopLogEntryCategoryHistograms(
  context: { infra: { mlSystem: MlSystem } },
  logEntryCategoriesCountJobId: string,
  categoryIds: number[],
  histograms: HistogramParameters[]
) {
  if (categoryIds.length === 0 || histograms.length === 0) {
    return {
      categoryHistogramsById: {},
      timing: { spans: [] },
    };
  }

  const finalizeEsSearchSpan = startTracingSpan('Fetch category histograms from ES');

  const categoryHistogramsReponses = await Promise.all(
    histograms.map(({ bucketCount, endTime, id: histogramId, startTime }) =>
      context.infra.mlSystem
        .mlAnomalySearch(
          createLogEntryCategoryHistogramsQuery(
            logEntryCategoriesCountJobId,
            categoryIds,
            startTime,
            endTime,
            bucketCount
          ),
          [logEntryCategoriesCountJobId]
        )
        .then(decodeOrThrow(logEntryCategoryHistogramsResponseRT))
        .then((response) => ({
          histogramId,
          histogramBuckets: response.aggregations.filters_categories.buckets,
        }))
    )
  );

  const esSearchSpan = finalizeEsSearchSpan();

  const categoryHistogramsById = Object.values(categoryHistogramsReponses).reduce<
    Record<
      number,
      Array<{
        histogramId: string;
        buckets: Array<{
          bucketDuration: number;
          logEntryCount: number;
          startTime: number;
        }>;
      }>
    >
  >(
    (outerAccumulatedHistograms, { histogramId, histogramBuckets }) =>
      Object.entries(histogramBuckets).reduce(
        (innerAccumulatedHistograms, [categoryBucketKey, categoryBucket]) => {
          const categoryId = parseCategoryId(categoryBucketKey);
          return {
            ...innerAccumulatedHistograms,
            [categoryId]: [
              ...(innerAccumulatedHistograms[categoryId] ?? []),
              {
                histogramId,
                buckets: categoryBucket.histogram_timestamp.buckets.map((bucket) => ({
                  bucketDuration: categoryBucket.histogram_timestamp.meta.bucketDuration,
                  logEntryCount: bucket.sum_actual.value,
                  startTime: bucket.key,
                })),
              },
            ],
          };
        },
        outerAccumulatedHistograms
      ),
    {}
  );

  return {
    categoryHistogramsById,
    timing: {
      spans: [esSearchSpan],
    },
  };
}

async function fetchLogEntryCategoryExamples(
  requestContext: { core: { elasticsearch: { client: { asCurrentUser: ElasticsearchClient } } } },
  indices: string,
  runtimeMappings: estypes.MappingRuntimeFields,
  timestampField: string,
  tiebreakerField: string,
  startTime: number,
  endTime: number,
  categoryQuery: string,
  exampleCount: number
) {
  const finalizeEsSearchSpan = startTracingSpan('Fetch examples from ES');

  const {
    hits: { hits },
  } = decodeOrThrow(logEntryCategoryExamplesResponseRT)(
    await requestContext.core.elasticsearch.client.asCurrentUser.search(
      createLogEntryCategoryExamplesQuery(
        indices,
        runtimeMappings,
        timestampField,
        tiebreakerField,
        startTime,
        endTime,
        categoryQuery,
        exampleCount
      )
    )
  );

  const esSearchSpan = finalizeEsSearchSpan();

  return {
    examples: hits.map((hit) => ({
      id: hit._id,
      dataset: hit.fields['event.dataset']?.[0] ?? '',
      message: hit.fields.message?.[0] ?? '',
      timestamp: hit.sort[0],
      tiebreaker: hit.sort[1],
      context: getContextFromFields(hit.fields),
    })),
    timing: {
      spans: [esSearchSpan],
    },
  };
}

const parseCategoryId = (rawCategoryId: string) => parseInt(rawCategoryId, 10);

const getContextFromFields = (fields: LogEntryCategoryExampleHit['fields']): LogEntryContext => {
  const containerId = fields['container.id']?.[0];
  const hostName = fields['host.name']?.[0];
  const logFilePath = fields['log.file.path']?.[0];

  if (typeof containerId === 'string') {
    return { 'container.id': containerId };
  }

  if (typeof hostName === 'string' && typeof logFilePath === 'string') {
    return { 'host.name': hostName, 'log.file.path': logFilePath };
  }

  return {};
};

interface HistogramParameters {
  id: string;
  startTime: number;
  endTime: number;
  bucketCount: number;
}
