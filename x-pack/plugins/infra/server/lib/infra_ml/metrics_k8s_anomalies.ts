/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraRequestHandlerContext } from '../../types';
import { TracingSpan, startTracingSpan } from '../../../common/performance_tracing';
import { fetchMlJob, getLogEntryDatasets } from './common';
import { getJobId, metricsK8SJobTypes } from '../../../common/infra_ml';
import { Sort, Pagination } from '../../../common/http_api/infra_ml';
import type { MlSystem, MlAnomalyDetectors } from '../../types';
import { InsufficientAnomalyMlJobsConfigured, isMlPrivilegesError } from './errors';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  metricsK8sAnomaliesResponseRT,
  createMetricsK8sAnomaliesQuery,
} from './queries/metrics_k8s_anomalies';

interface MappedAnomalyHit {
  id: string;
  anomalyScore: number;
  // dataset: string;
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
  const metricsK8sJobId = getJobId(spaceId, sourceId, metricsK8SJobTypes[0]);

  const jobIds: string[] = [];
  let jobSpans: TracingSpan[] = [];

  try {
    const {
      timing: { spans },
    } = await fetchMlJob(mlAnomalyDetectors, metricsK8sJobId);
    jobIds.push(metricsK8sJobId);
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

export async function getMetricK8sAnomalies(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  sort: Sort,
  pagination: Pagination
) {
  const finalizeMetricsK8sAnomaliesSpan = startTracingSpan('get metrics k8s entry anomalies');

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
  } = await fetchMetricK8sAnomalies(
    context.infra.mlSystem,
    jobIds,
    startTime,
    endTime,
    sort,
    pagination
  );

  const data = anomalies.map((anomaly) => {
    const { jobId } = anomaly;

    return parseAnomalyResult(anomaly, jobId);
  });

  const metricsK8sAnomaliesSpan = finalizeMetricsK8sAnomaliesSpan();

  return {
    data,
    paginationCursors,
    hasMoreEntries,
    timing: {
      spans: [metricsK8sAnomaliesSpan, ...jobSpans, ...fetchLogEntryAnomaliesSpans],
    },
  };
}

const parseAnomalyResult = (anomaly: MappedAnomalyHit, jobId: string) => {
  const {
    id,
    anomalyScore,
    // dataset,
    typical,
    actual,
    duration,
    startTime: anomalyStartTime,
  } = anomaly;

  return {
    id,
    anomalyScore,
    // dataset,
    typical,
    actual,
    duration,
    startTime: anomalyStartTime,
    type: 'metrics_k8s' as const,
    jobId,
  };
};

async function fetchMetricK8sAnomalies(
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

  const finalizeFetchLogEntryAnomaliesSpan = startTracingSpan('fetch metrics k8s anomalies');

  const results = decodeOrThrow(metricsK8sAnomaliesResponseRT)(
    await mlSystem.mlAnomalySearch(
      createMetricsK8sAnomaliesQuery(jobIds, startTime, endTime, sort, expandedPagination)
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
      // partition_field_value: dataset,
      bucket_span: duration,
      timestamp: anomalyStartTime,
      by_field_value: categoryId,
    } = result._source;

    return {
      id: result._id,
      anomalyScore,
      // dataset,
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

// TODO: FIgure out why we need datasets
export async function getMetricK8sAnomaliesDatasets(
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
