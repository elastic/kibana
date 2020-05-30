/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import {
  compareDatasetsByMaximumAnomalyScore,
  getJobId,
  jobCustomSettingsRT,
  logEntryCategoriesJobTypes,
} from '../../../common/log_analysis';
import { startTracingSpan, TracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
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
import { createMlJobsQuery, mlJobsResponseRT } from './queries/ml_jobs';
import {
  createTopLogEntryCategoriesQuery,
  topLogEntryCategoriesResponseRT,
} from './queries/top_log_entry_categories';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export class LogEntryCategoriesAnalysis {
  constructor(
    private readonly libs: {
      framework: KibanaFramework;
    }
  ) {}

  public async getTopLogEntryCategories(
    requestContext: RequestHandlerContext,
    request: KibanaRequest,
    sourceId: string,
    startTime: number,
    endTime: number,
    categoryCount: number,
    datasets: string[],
    histograms: HistogramParameters[]
  ) {
    const finalizeTopLogEntryCategoriesSpan = startTracingSpan('get top categories');

    const logEntryCategoriesCountJobId = getJobId(
      this.libs.framework.getSpaceId(request),
      sourceId,
      logEntryCategoriesJobTypes[0]
    );

    const {
      topLogEntryCategories,
      timing: { spans: fetchTopLogEntryCategoriesAggSpans },
    } = await this.fetchTopLogEntryCategories(
      requestContext,
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
    } = await this.fetchLogEntryCategories(
      requestContext,
      logEntryCategoriesCountJobId,
      categoryIds
    );

    const {
      categoryHistogramsById,
      timing: { spans: fetchTopLogEntryCategoryHistogramsSpans },
    } = await this.fetchTopLogEntryCategoryHistograms(
      requestContext,
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

  public async getLogEntryCategoryDatasets(
    requestContext: RequestHandlerContext,
    request: KibanaRequest,
    sourceId: string,
    startTime: number,
    endTime: number
  ) {
    const finalizeLogEntryDatasetsSpan = startTracingSpan('get data sets');

    const logEntryCategoriesCountJobId = getJobId(
      this.libs.framework.getSpaceId(request),
      sourceId,
      logEntryCategoriesJobTypes[0]
    );

    let logEntryDatasetBuckets: LogEntryDatasetBucket[] = [];
    let afterLatestBatchKey: CompositeDatasetKey | undefined;
    let esSearchSpans: TracingSpan[] = [];

    while (true) {
      const finalizeEsSearchSpan = startTracingSpan('fetch category dataset batch from ES');

      const logEntryDatasetsResponse = decodeOrThrow(logEntryDatasetsResponseRT)(
        await this.libs.framework.callWithRequest(
          requestContext,
          'search',
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
      data: logEntryDatasetBuckets.map(
        (logEntryDatasetBucket) => logEntryDatasetBucket.key.dataset
      ),
      timing: {
        spans: [logEntryDatasetsSpan, ...esSearchSpans],
      },
    };
  }

  public async getLogEntryCategoryExamples(
    requestContext: RequestHandlerContext,
    request: KibanaRequest,
    sourceId: string,
    startTime: number,
    endTime: number,
    categoryId: number,
    exampleCount: number
  ) {
    const finalizeLogEntryCategoryExamplesSpan = startTracingSpan(
      'get category example log entries'
    );

    const logEntryCategoriesCountJobId = getJobId(
      this.libs.framework.getSpaceId(request),
      sourceId,
      logEntryCategoriesJobTypes[0]
    );

    const {
      mlJob,
      timing: { spans: fetchMlJobSpans },
    } = await this.fetchMlJob(requestContext, logEntryCategoriesCountJobId);

    const customSettings = decodeOrThrow(jobCustomSettingsRT)(mlJob.custom_settings);
    const indices = customSettings?.logs_source_config?.indexPattern;
    const timestampField = customSettings?.logs_source_config?.timestampField;

    if (indices == null || timestampField == null) {
      throw new InsufficientLogAnalysisMlJobConfigurationError(
        `Failed to find index configuration for ml job ${logEntryCategoriesCountJobId}`
      );
    }

    const {
      logEntryCategoriesById,
      timing: { spans: fetchLogEntryCategoriesSpans },
    } = await this.fetchLogEntryCategories(requestContext, logEntryCategoriesCountJobId, [
      categoryId,
    ]);
    const category = logEntryCategoriesById[categoryId];

    if (category == null) {
      throw new UnknownCategoryError(categoryId);
    }

    const {
      examples,
      timing: { spans: fetchLogEntryCategoryExamplesSpans },
    } = await this.fetchLogEntryCategoryExamples(
      requestContext,
      indices,
      timestampField,
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

  private async fetchTopLogEntryCategories(
    requestContext: RequestHandlerContext,
    logEntryCategoriesCountJobId: string,
    startTime: number,
    endTime: number,
    categoryCount: number,
    datasets: string[]
  ) {
    const finalizeEsSearchSpan = startTracingSpan('Fetch top categories from ES');

    const topLogEntryCategoriesResponse = decodeOrThrow(topLogEntryCategoriesResponseRT)(
      await this.libs.framework.callWithRequest(
        requestContext,
        'search',
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

  private async fetchLogEntryCategories(
    requestContext: RequestHandlerContext,
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
      await this.libs.framework.callWithRequest(
        requestContext,
        'search',
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

  private async fetchTopLogEntryCategoryHistograms(
    requestContext: RequestHandlerContext,
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
        this.libs.framework
          .callWithRequest(
            requestContext,
            'search',
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

  private async fetchMlJob(
    requestContext: RequestHandlerContext,
    logEntryCategoriesCountJobId: string
  ) {
    const finalizeMlGetJobSpan = startTracingSpan('Fetch ml job from ES');

    const {
      jobs: [mlJob],
    } = decodeOrThrow(mlJobsResponseRT)(
      await this.libs.framework.callWithRequest(
        requestContext,
        'transport.request',
        createMlJobsQuery([logEntryCategoriesCountJobId])
      )
    );

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

  private async fetchLogEntryCategoryExamples(
    requestContext: RequestHandlerContext,
    indices: string,
    timestampField: string,
    startTime: number,
    endTime: number,
    categoryQuery: string,
    exampleCount: number
  ) {
    const finalizeEsSearchSpan = startTracingSpan('Fetch examples from ES');

    const {
      hits: { hits },
    } = decodeOrThrow(logEntryCategoryExamplesResponseRT)(
      await this.libs.framework.callWithRequest(
        requestContext,
        'search',
        createLogEntryCategoryExamplesQuery(
          indices,
          timestampField,
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
        dataset: hit._source.event?.dataset ?? '',
        message: hit._source.message ?? '',
        timestamp: hit.sort[0],
      })),
      timing: {
        spans: [esSearchSpan],
      },
    };
  }
}

const parseCategoryId = (rawCategoryId: string) => parseInt(rawCategoryId, 10);

interface HistogramParameters {
  id: string;
  startTime: number;
  endTime: number;
  bucketCount: number;
}
