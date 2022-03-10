/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  AnomaliesSort,
  getJobId,
  isCategoryAnomaly,
  jobCustomSettingsRT,
  LogEntryAnomalyDatasets,
  logEntryCategoriesJobTypes,
  logEntryRateJobTypes,
  Pagination,
} from '../../../common/log_analysis';
import { ResolvedLogView } from '../../../common/log_views';
import { startTracingSpan, TracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import type {
  InfraPluginRequestHandlerContext,
  InfraRequestHandlerContext,
  MlAnomalyDetectors,
  MlSystem,
} from '../../types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { fetchMlJob, getLogEntryDatasets } from './common';
import {
  InsufficientAnomalyMlJobsConfigured,
  InsufficientLogAnalysisMlJobConfigurationError,
  isMlPrivilegesError,
  UnknownCategoryError,
} from './errors';
import { fetchLogEntryCategories } from './log_entry_categories_analysis';
import { createLogEntryAnomaliesQuery, logEntryAnomaliesResponseRT } from './queries';
import {
  createLogEntryExamplesQuery,
  logEntryExamplesResponseRT,
} from './queries/log_entry_examples';

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

async function getCompatibleAnomaliesJobIds(
  spaceId: string,
  sourceId: string,
  mlAnomalyDetectors: MlAnomalyDetectors
) {
  const logRateJobId = getJobId(spaceId, sourceId, logEntryRateJobTypes[0]);
  const logCategoriesJobId = getJobId(spaceId, sourceId, logEntryCategoriesJobTypes[0]);

  const jobIds: string[] = [];
  let jobSpans: TracingSpan[] = [];

  try {
    const {
      timing: { spans },
    } = await fetchMlJob(mlAnomalyDetectors, logRateJobId);
    jobIds.push(logRateJobId);
    jobSpans = [...jobSpans, ...spans];
  } catch (e) {
    if (isMlPrivilegesError(e)) {
      throw e;
    }
    // An error is also thrown when no jobs are found
  }

  try {
    const {
      timing: { spans },
    } = await fetchMlJob(mlAnomalyDetectors, logCategoriesJobId);
    jobIds.push(logCategoriesJobId);
    jobSpans = [...jobSpans, ...spans];
  } catch (e) {
    if (isMlPrivilegesError(e)) {
      throw e;
    }
    // An error is also thrown when no jobs are found
  }

  return {
    jobIds,
    timing: { spans: jobSpans },
  };
}

export async function getLogEntryAnomalies(
  context: InfraPluginRequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  sort: AnomaliesSort,
  pagination: Pagination,
  datasets?: LogEntryAnomalyDatasets
) {
  const finalizeLogEntryAnomaliesSpan = startTracingSpan('get log entry anomalies');

  const {
    jobIds,
    timing: { spans: jobSpans },
  } = await getCompatibleAnomaliesJobIds(
    context.infra.spaceId,
    sourceId,
    context.infra.mlAnomalyDetectors
  );

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
    pagination,
    datasets
  );

  const parsedAnomalies = anomalies.map((anomaly) => {
    const { jobId } = anomaly;

    if (!anomaly.categoryId) {
      return parseLogRateAnomalyResult(anomaly, jobId);
    } else {
      return parseCategoryAnomalyResult(anomaly, jobId);
    }
  });

  const categoryIds = parsedAnomalies.reduce<number[]>((acc, anomaly) => {
    return isCategoryAnomaly(anomaly) ? [...acc, parseInt(anomaly.categoryId, 10)] : acc;
  }, []);

  const logEntryCategoriesCountJobId = getJobId(
    context.infra.spaceId,
    sourceId,
    logEntryCategoriesJobTypes[0]
  );

  const { logEntryCategoriesById } = await fetchLogEntryCategories(
    context,
    logEntryCategoriesCountJobId,
    categoryIds
  );

  const parsedAnomaliesWithExpandedCategoryInformation = parsedAnomalies.map((anomaly) => {
    if (isCategoryAnomaly(anomaly)) {
      if (logEntryCategoriesById[parseInt(anomaly.categoryId, 10)]) {
        const {
          _source: { regex, terms },
        } = logEntryCategoriesById[parseInt(anomaly.categoryId, 10)];
        return { ...anomaly, ...{ categoryRegex: regex, categoryTerms: terms } };
      } else {
        return { ...anomaly, ...{ categoryRegex: '', categoryTerms: '' } };
      }
    } else {
      return anomaly;
    }
  });

  const logEntryAnomaliesSpan = finalizeLogEntryAnomaliesSpan();

  return {
    data: parsedAnomaliesWithExpandedCategoryInformation,
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
  sort: AnomaliesSort,
  pagination: Pagination,
  datasets?: LogEntryAnomalyDatasets
) {
  // We'll request 1 extra entry on top of our pageSize to determine if there are
  // more entries to be fetched. This avoids scenarios where the client side can't
  // determine if entries.length === pageSize actually means there are more entries / next page
  // or not.
  const expandedPagination = { ...pagination, pageSize: pagination.pageSize + 1 };

  const finalizeFetchLogEntryAnomaliesSpan = startTracingSpan('fetch log entry anomalies');

  const results = decodeOrThrow(logEntryAnomaliesResponseRT)(
    await mlSystem.mlAnomalySearch(
      createLogEntryAnomaliesQuery(jobIds, startTime, endTime, sort, expandedPagination, datasets),
      jobIds
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
      job_id,
      record_score: anomalyScore,
      typical,
      actual,
      partition_field_value: dataset,
      bucket_span: duration,
      timestamp: anomalyStartTime,
      by_field_value: categoryId,
    } = result.fields;

    return {
      id: result._id,
      anomalyScore: anomalyScore[0],
      dataset: dataset[0],
      typical: typical[0],
      actual: actual[0],
      jobId: job_id[0],
      startTime: parseInt(anomalyStartTime[0], 10),
      duration: duration[0] * 1000,
      categoryId: categoryId?.[0],
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
  context: InfraPluginRequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  dataset: string,
  exampleCount: number,
  resolvedLogView: ResolvedLogView,
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
  const { tiebreakerField, runtimeMappings } = resolvedLogView;

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
    runtimeMappings,
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
  context: InfraPluginRequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  indices: string,
  runtimeMappings: estypes.MappingRuntimeFields,
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
        runtimeMappings,
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
      dataset: hit.fields['event.dataset']?.[0] ?? '',
      message: hit.fields.message?.[0] ?? '',
      timestamp: hit.sort[0],
      tiebreaker: hit.sort[1],
    })),
    timing: {
      spans: [esSearchSpan],
    },
  };
}

export async function getLogEntryAnomaliesDatasets(
  context: {
    infra: {
      mlSystem: MlSystem;
      mlAnomalyDetectors: MlAnomalyDetectors;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number
) {
  const {
    jobIds,
    timing: { spans: jobSpans },
  } = await getCompatibleAnomaliesJobIds(
    context.infra.spaceId,
    sourceId,
    context.infra.mlAnomalyDetectors
  );

  if (jobIds.length === 0) {
    throw new InsufficientAnomalyMlJobsConfigured(
      'Log rate or categorisation ML jobs need to be configured to search for anomaly datasets'
    );
  }

  const {
    data: datasets,
    timing: { spans: datasetsSpans },
  } = await getLogEntryDatasets(context.infra.mlSystem, startTime, endTime, jobIds);

  return {
    datasets,
    timing: {
      spans: [...jobSpans, ...datasetsSpans],
    },
  };
}
