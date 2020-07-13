/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraRequestHandlerContext } from '../../types';
import { TracingSpan, startTracingSpan } from '../../../common/performance_tracing';
import { fetchMlJob } from './common';
import {
  getJobId,
  logEntryCategoriesJobTypes,
  logEntryRateJobTypes,
  jobCustomSettingsRT,
} from '../../../common/log_analysis';
import { Sort, Pagination } from '../../../common/http_api/log_analysis';
import type { MlSystem } from '../../types';
import { createLogEntryAnomaliesQuery, logEntryAnomaliesResponseRT } from './queries';
import {
  InsufficientAnomalyMlJobsConfigured,
  InsufficientLogAnalysisMlJobConfigurationError,
  UnknownCategoryError,
} from './errors';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  createLogEntryExamplesQuery,
  logEntryExamplesResponseRT,
} from './queries/log_entry_examples';
import { InfraSource } from '../sources';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { fetchLogEntryCategories } from './log_entry_categories_analysis';

interface MappedAnomalyHit {
  id: string;
  anomalyScore: number;
  dataset: string;
  typical: number;
  actual: number;
  jobId: string;
  startTime: number;
  duration: number;
  categoryId?: string;
}

export async function getLogEntryAnomalies(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  sort: Sort,
  pagination: Pagination
) {
  const finalizeLogEntryAnomaliesSpan = startTracingSpan('get log entry anomalies');

  const logRateJobId = getJobId(context.infra.spaceId, sourceId, logEntryRateJobTypes[0]);
  const logCategoriesJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  const jobIds: string[] = [];
  let jobSpans: TracingSpan[] = [];

  try {
    const {
      timing: { spans },
    } = await fetchMlJob(context.infra.mlAnomalyDetectors, logRateJobId);
    jobIds.push(logRateJobId);
    jobSpans = [...jobSpans, ...spans];
  } catch (e) {
    // Job wasn't found
  }

  try {
    const {
      timing: { spans },
    } = await fetchMlJob(context.infra.mlAnomalyDetectors, logCategoriesJobId);
    jobIds.push(logCategoriesJobId);
    jobSpans = [...jobSpans, ...spans];
  } catch (e) {
    // Job wasn't found
  }

  if (jobIds.length === 0) {
    throw new InsufficientAnomalyMlJobsConfigured(
      'Log rate or categorisation ML jobs need to be configured to search anomalies'
    );
  }

  const {
    anomalies,
    paginationCursors,
    hasMoreEntries,
    timing: { spans: fetchLogEntryAnomaliesSpans },
  } = await fetchLogEntryAnomalies(
    context.infra.mlSystem,
    jobIds,
    startTime,
    endTime,
    sort,
    pagination
  );

  const data = anomalies.map((anomaly) => {
    const { jobId } = anomaly;

    if (jobId === logRateJobId) {
      return parseLogRateAnomalyResult(anomaly, logRateJobId);
    } else {
      return parseCategoryAnomalyResult(anomaly, logCategoriesJobId);
    }
  });

  const logEntryAnomaliesSpan = finalizeLogEntryAnomaliesSpan();

  return {
    data,
    paginationCursors,
    hasMoreEntries,
    timing: {
      spans: [logEntryAnomaliesSpan, ...jobSpans, ...fetchLogEntryAnomaliesSpans],
    },
  };
}

const parseLogRateAnomalyResult = (anomaly: MappedAnomalyHit, jobId: string) => {
  const {
    id,
    anomalyScore,
    dataset,
    typical,
    actual,
    duration,
    startTime: anomalyStartTime,
  } = anomaly;

  return {
    id,
    anomalyScore,
    dataset,
    typical,
    actual,
    duration,
    startTime: anomalyStartTime,
    type: 'logRate' as const,
    jobId,
  };
};

const parseCategoryAnomalyResult = (anomaly: MappedAnomalyHit, jobId: string) => {
  const {
    id,
    anomalyScore,
    dataset,
    typical,
    actual,
    duration,
    startTime: anomalyStartTime,
    categoryId,
  } = anomaly;

  return {
    id,
    anomalyScore,
    dataset,
    typical,
    actual,
    duration,
    startTime: anomalyStartTime,
    categoryId,
    type: 'logCategory' as const,
    jobId,
  };
};

async function fetchLogEntryAnomalies(
  mlSystem: MlSystem,
  jobIds: string[],
  startTime: number,
  endTime: number,
  sort: Sort,
  pagination: Pagination
) {
  // We'll request 1 extra entry on top of our pageSize to determine if there are
  // more entries to be fetched. This avoids scenarios where the client side can't
  // determine if entries.length === pageSize actually means there are more entries / next page
  // or not.
  const expandedPagination = { ...pagination, pageSize: pagination.pageSize + 1 };

  const finalizeFetchLogEntryAnomaliesSpan = startTracingSpan('fetch log entry anomalies');

  const results = decodeOrThrow(logEntryAnomaliesResponseRT)(
    await mlSystem.mlAnomalySearch(
      createLogEntryAnomaliesQuery(jobIds, startTime, endTime, sort, expandedPagination)
    )
  );

  const {
    hits: { hits },
  } = results;
  const hasMoreEntries = hits.length > pagination.pageSize;

  // An extra entry was found and hasMoreEntries has been determined, the extra entry can be removed.
  if (hasMoreEntries) {
    hits.pop();
  }

  // To "search_before" the sort order will have been reversed for ES.
  // The results are now reversed back, to match the requested sort.
  if (pagination.cursor && 'searchBefore' in pagination.cursor) {
    hits.reverse();
  }

  const paginationCursors =
    hits.length > 0
      ? {
          previousPageCursor: hits[0].sort,
          nextPageCursor: hits[hits.length - 1].sort,
        }
      : undefined;

  const anomalies = hits.map((result) => {
    const {
      job_id,
      record_score: anomalyScore,
      typical,
      actual,
      partition_field_value: dataset,
      bucket_span: duration,
      timestamp: anomalyStartTime,
      by_field_value: categoryId,
    } = result._source;

    return {
      id: result._id,
      anomalyScore,
      dataset,
      typical: typical[0],
      actual: actual[0],
      jobId: job_id,
      startTime: anomalyStartTime,
      duration: duration * 1000,
      categoryId,
    };
  });

  const fetchLogEntryAnomaliesSpan = finalizeFetchLogEntryAnomaliesSpan();

  return {
    anomalies,
    paginationCursors,
    hasMoreEntries,
    timing: {
      spans: [fetchLogEntryAnomaliesSpan],
    },
  };
}

export async function getLogEntryExamples(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  dataset: string,
  exampleCount: number,
  sourceConfiguration: InfraSource,
  callWithRequest: KibanaFramework['callWithRequest'],
  categoryId?: string
) {
  const finalizeLogEntryExamplesSpan = startTracingSpan('get log entry rate example log entries');

  const jobId = getJobId(
    context.infra.spaceId,
    sourceId,
    categoryId != null ? logEntryCategoriesJobTypes[0] : logEntryRateJobTypes[0]
  );

  const {
    mlJob,
    timing: { spans: fetchMlJobSpans },
  } = await fetchMlJob(context.infra.mlAnomalyDetectors, jobId);

  const customSettings = decodeOrThrow(jobCustomSettingsRT)(mlJob.custom_settings);
  const indices = customSettings?.logs_source_config?.indexPattern;
  const timestampField = customSettings?.logs_source_config?.timestampField;
  const tiebreakerField = sourceConfiguration.configuration.fields.tiebreaker;

  if (indices == null || timestampField == null) {
    throw new InsufficientLogAnalysisMlJobConfigurationError(
      `Failed to find index configuration for ml job ${jobId}`
    );
  }

  const {
    examples,
    timing: { spans: fetchLogEntryExamplesSpans },
  } = await fetchLogEntryExamples(
    context,
    sourceId,
    indices,
    timestampField,
    tiebreakerField,
    startTime,
    endTime,
    dataset,
    exampleCount,
    callWithRequest,
    categoryId
  );

  const logEntryExamplesSpan = finalizeLogEntryExamplesSpan();

  return {
    data: examples,
    timing: {
      spans: [logEntryExamplesSpan, ...fetchMlJobSpans, ...fetchLogEntryExamplesSpans],
    },
  };
}

export async function fetchLogEntryExamples(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  indices: string,
  timestampField: string,
  tiebreakerField: string,
  startTime: number,
  endTime: number,
  dataset: string,
  exampleCount: number,
  callWithRequest: KibanaFramework['callWithRequest'],
  categoryId?: string
) {
  const finalizeEsSearchSpan = startTracingSpan('Fetch log rate examples from ES');

  let categoryQuery: string | undefined;

  // Examples should be further scoped to a specific ML category
  if (categoryId) {
    const parsedCategoryId = parseInt(categoryId, 10);

    const logEntryCategoriesCountJobId = getJobId(
      context.infra.spaceId,
      sourceId,
      logEntryCategoriesJobTypes[0]
    );

    const { logEntryCategoriesById } = await fetchLogEntryCategories(
      context,
      logEntryCategoriesCountJobId,
      [parsedCategoryId]
    );

    const category = logEntryCategoriesById[parsedCategoryId];

    if (category == null) {
      throw new UnknownCategoryError(parsedCategoryId);
    }

    categoryQuery = category._source.terms;
  }

  const {
    hits: { hits },
  } = decodeOrThrow(logEntryExamplesResponseRT)(
    await callWithRequest(
      context,
      'search',
      createLogEntryExamplesQuery(
        indices,
        timestampField,
        tiebreakerField,
        startTime,
        endTime,
        dataset,
        exampleCount,
        categoryQuery
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
    })),
    timing: {
      spans: [esSearchSpan],
    },
  };
}
