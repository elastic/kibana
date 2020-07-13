/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { ILegacyScopedClusterClient } from 'src/core/server';
import { LogEntryContext } from '../../../common/http_api';
import {
  compareDatasetsByMaximumAnomalyScore,
  getJobId,
  jobCustomSettingsRT,
  logEntryCategoriesJobTypes,
} from '../../../common/log_analysis';
import { startTracingSpan, TracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { MlAnomalyDetectors, MlSystem } from '../../types';
import {
  InsufficientLogAnalysisMlJobConfigurationError,
  NoLogAnalysisMlJobError,
  NoLogAnalysisResultsIndexError,
  UnknownCategoryError,
} from './errors';
import {
  createLogEntryCategoriesQuery,
  logEntryCategoriesResponseRT,
  LogEntryCategoryHit,
} from './queries/log_entry_categories';
import {
  createLogEntryCategoryExamplesQuery,
  logEntryCategoryExamplesResponseRT,
} from './queries/log_entry_category_examples';
import {
  createLogEntryCategoryHistogramsQuery,
  logEntryCategoryHistogramsResponseRT,
} from './queries/log_entry_category_histograms';
import {
  CompositeDatasetKey,
  createLogEntryDatasetsQuery,
  LogEntryDatasetBucket,
  logEntryDatasetsResponseRT,
} from './queries/log_entry_data_sets';
import {
  createTopLogEntryCategoriesQuery,
  topLogEntryCategoriesResponseRT,
} from './queries/top_log_entry_categories';
import { InfraSource } from '../sources';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

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
  histograms: HistogramParameters[]
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
    datasets
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
  const finalizeLogEntryDatasetsSpan = startTracingSpan('get data sets');

  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  let logEntryDatasetBuckets: LogEntryDatasetBucket[] = [];
  let afterLatestBatchKey: CompositeDatasetKey | undefined;
  let esSearchSpans: TracingSpan[] = [];

  while (true) {
    const finalizeEsSearchSpan = startTracingSpan('fetch category dataset batch from ES');

    const logEntryDatasetsResponse = decodeOrThrow(logEntryDatasetsResponseRT)(
      await context.infra.mlSystem.mlAnomalySearch(
        createLogEntryDatasetsQuery(
          logEntryCategoriesCountJobId,
          startTime,
          endTime,
          COMPOSITE_AGGREGATION_BATCH_SIZE,
          afterLatestBatchKey
        )
      )
    );

    if (logEntryDatasetsResponse._shards.total === 0) {
      throw new NoLogAnalysisResultsIndexError(
        `Failed to find ml result index for job ${logEntryCategoriesCountJobId}.`
      );
    }

    const {
      after_key: afterKey,
      buckets: latestBatchBuckets,
    } = logEntryDatasetsResponse.aggregations.dataset_buckets;

    logEntryDatasetBuckets = [...logEntryDatasetBuckets, ...latestBatchBuckets];
    afterLatestBatchKey = afterKey;
    esSearchSpans = [...esSearchSpans, finalizeEsSearchSpan()];

    if (latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
      break;
    }
  }

  const logEntryDatasetsSpan = finalizeLogEntryDatasetsSpan();

  return {
    data: logEntryDatasetBuckets.map((logEntryDatasetBucket) => logEntryDatasetBucket.key.dataset),
    timing: {
      spans: [logEntryDatasetsSpan, ...esSearchSpans],
    },
  };
}

export async function getLogEntryCategoryExamples(
  context: {
    core: { elasticsearch: { legacy: { client: ILegacyScopedClusterClient } } };
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
  sourceConfiguration: InfraSource
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
  } = await fetchMlJob(context, logEntryCategoriesCountJobId);

  const customSettings = decodeOrThrow(jobCustomSettingsRT)(mlJob.custom_settings);
  const indices = customSettings?.logs_source_config?.indexPattern;
  const timestampField = customSettings?.logs_source_config?.timestampField;
  const tiebreakerField = sourceConfiguration.configuration.fields.tiebreaker;

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
  datasets: string[]
) {
  const finalizeEsSearchSpan = startTracingSpan('Fetch top categories from ES');

  const topLogEntryCategoriesResponse = decodeOrThrow(topLogEntryCategoriesResponseRT)(
    await context.infra.mlSystem.mlAnomalySearch(
      createTopLogEntryCategoriesQuery(
        logEntryCategoriesCountJobId,
        startTime,
        endTime,
        categoryCount,
        datasets
      )
    )
  );

  const esSearchSpan = finalizeEsSearchSpan();

  if (topLogEntryCategoriesResponse._shards.total === 0) {
    throw new NoLogAnalysisResultsIndexError(
      `Failed to find ml result index for job ${logEntryCategoriesCountJobId}.`
    );
  }

  const topLogEntryCategories = topLogEntryCategoriesResponse.aggregations.terms_category_id.buckets.map(
    (topCategoryBucket) => {
      const maximumAnomalyScoresByDataset = topCategoryBucket.filter_record.terms_dataset.buckets.reduce<
        Record<string, number>
      >(
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
  );

  return {
    topLogEntryCategories,
    timing: {
      spans: [esSearchSpan],
    },
  };
}

async function fetchLogEntryCategories(
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
      createLogEntryCategoriesQuery(logEntryCategoriesCountJobId, categoryIds)
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
          )
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

async function fetchMlJob(
  context: { infra: { mlAnomalyDetectors: MlAnomalyDetectors } },
  logEntryCategoriesCountJobId: string
) {
  const finalizeMlGetJobSpan = startTracingSpan('Fetch ml job from ES');

  const {
    jobs: [mlJob],
  } = await context.infra.mlAnomalyDetectors.jobs(logEntryCategoriesCountJobId);

  const mlGetJobSpan = finalizeMlGetJobSpan();

  if (mlJob == null) {
    throw new NoLogAnalysisMlJobError(`Failed to find ml job ${logEntryCategoriesCountJobId}.`);
  }

  return {
    mlJob,
    timing: {
      spans: [mlGetJobSpan],
    },
  };
}

async function fetchLogEntryCategoryExamples(
  requestContext: { core: { elasticsearch: { legacy: { client: ILegacyScopedClusterClient } } } },
  indices: string,
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
    await requestContext.core.elasticsearch.legacy.client.callAsCurrentUser(
      'search',
      createLogEntryCategoryExamplesQuery(
        indices,
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
      dataset: hit._source.event?.dataset ?? '',
      message: hit._source.message ?? '',
      timestamp: hit.sort[0],
      tiebreaker: hit.sort[1],
      context: getContextFromSource(hit._source),
    })),
    timing: {
      spans: [esSearchSpan],
    },
  };
}

const parseCategoryId = (rawCategoryId: string) => parseInt(rawCategoryId, 10);

const getContextFromSource = (source: any): LogEntryContext => {
  const containerId = source.container?.id;
  const hostName = source.host?.name;
  const logFilePath = source.log?.file?.path;

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
