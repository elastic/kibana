/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraRequestHandlerContext } from '../../types';
import { TracingSpan, startTracingSpan } from '../../../common/performance_tracing';
import { fetchMlJob, getLogEntryDatasets } from './common';
import { getJobId, logEntryCategoriesJobTypes } from '../../../common/log_analysis';
import {
  Sort,
  Pagination,
  GetLogEntryAnomaliesRequestPayload,
} from '../../../common/http_api/log_analysis';
import type { MlSystem, MlAnomalyDetectors } from '../../types';
import { createLogEntryAnomaliesQuery, logEntryAnomaliesResponseRT } from './queries';
import { decodeOrThrow } from '../../../common/runtime_types';
import { InsufficientAnomalyMlJobsConfigured } from './errors';

async function getCompatibleAnomaliesJobIds(
  spaceId: string,
  sourceId: string,
  mlAnomalyDetectors: MlAnomalyDetectors
) {
  const logRateJobId = getJobId(spaceId, sourceId, 'log-entry-rate');
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
    // Job wasn't found
  }

  try {
    const {
      timing: { spans },
    } = await fetchMlJob(mlAnomalyDetectors, logCategoriesJobId);
    jobIds.push(logCategoriesJobId);
    jobSpans = [...jobSpans, ...spans];
  } catch (e) {
    // Job wasn't found
  }

  return {
    jobIds,
    timing: { spans: jobSpans },
  };
}

export async function getLogEntryAnomalies(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  sort: Sort,
  pagination: Pagination,
  datasets: GetLogEntryAnomaliesRequestPayload['data']['datasets']
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

  const data = anomalies.map((anomaly) => {
    const {
      id,
      anomalyScore,
      dataset,
      typical,
      actual,
      jobId,
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
      type: jobId.includes('log-entry-rate') ? ('logRate' as const) : ('logCategory' as const),
    };
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

async function fetchLogEntryAnomalies(
  mlSystem: MlSystem,
  jobIds: string[],
  startTime: number,
  endTime: number,
  sort: Sort,
  pagination: Pagination,
  datasets: GetLogEntryAnomaliesRequestPayload['data']['datasets']
) {
  // We'll request 1 extra entry on top of our pageSize to determine if there are
  // more entries to be fetched. This avoids scenarios where the client side can't
  // determine if entries.length === pageSize actually means there are more entries / next page
  // / or not.
  const expandedPagination = { ...pagination, pageSize: pagination.pageSize + 1 };

  const finalizeFetchLogEntryAnomaliesSpan = startTracingSpan('fetch log entry anomalies');

  const results = decodeOrThrow(logEntryAnomaliesResponseRT)(
    await mlSystem.mlAnomalySearch(
      createLogEntryAnomaliesQuery(jobIds, startTime, endTime, sort, expandedPagination, datasets)
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
