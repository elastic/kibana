/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraRequestHandlerContext } from '../../types';
import { TracingSpan, startTracingSpan } from '../../../common/performance_tracing';
import { fetchMlJob } from './common';
import { getJobId, metricsHostsJobTypes } from '../../../common/infra_ml';
import { Sort, Pagination } from '../../../common/http_api/infra_ml';
import type { MlSystem, MlAnomalyDetectors } from '../../types';
import { InsufficientAnomalyMlJobsConfigured, isMlPrivilegesError } from './errors';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  metricsHostsAnomaliesResponseRT,
  createMetricsHostsAnomaliesQuery,
} from './queries/metrics_hosts_anomalies';

interface MappedAnomalyHit {
  id: string;
  anomalyScore: number;
  typical: number;
  actual: number;
  jobId: string;
  startTime: number;
  duration: number;
  influencers: string[];
  categoryId?: string;
}

async function getCompatibleAnomaliesJobIds(
  spaceId: string,
  sourceId: string,
  metric: 'memory_usage' | 'network_in' | 'network_out' | undefined,
  mlAnomalyDetectors: MlAnomalyDetectors
) {
  let metricsHostsJobIds = metricsHostsJobTypes;

  if (metric) {
    metricsHostsJobIds = metricsHostsJobIds.filter((jt) => jt === `hosts_${metric}`);
  }

  const jobIds: string[] = [];
  let jobSpans: TracingSpan[] = [];

  try {
    await Promise.all(
      metricsHostsJobIds
        .map((jt) => getJobId(spaceId, sourceId, jt))
        .map((id) => {
          return (async () => {
            const {
              timing: { spans },
            } = await fetchMlJob(mlAnomalyDetectors, id);
            jobIds.push(id);
            jobSpans = [...jobSpans, ...spans];
          })();
        })
    );
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

export async function getMetricsHostsAnomalies(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  metric: 'memory_usage' | 'network_in' | 'network_out' | undefined,
  sort: Sort,
  pagination: Pagination
) {
  const finalizeMetricsHostsAnomaliesSpan = startTracingSpan('get metrics hosts entry anomalies');

  const {
    jobIds,
    timing: { spans: jobSpans },
  } = await getCompatibleAnomaliesJobIds(
    context.infra.spaceId,
    sourceId,
    metric,
    context.infra.mlAnomalyDetectors
  );

  if (jobIds.length === 0) {
    throw new InsufficientAnomalyMlJobsConfigured(
      'Metrics Hosts ML jobs need to be configured to search anomalies'
    );
  }

  try {
    const {
      anomalies,
      paginationCursors,
      hasMoreEntries,
      timing: { spans: fetchLogEntryAnomaliesSpans },
    } = await fetchMetricsHostsAnomalies(
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

    const metricsHostsAnomaliesSpan = finalizeMetricsHostsAnomaliesSpan();

    return {
      data,
      paginationCursors,
      hasMoreEntries,
      timing: {
        spans: [metricsHostsAnomaliesSpan, ...jobSpans, ...fetchLogEntryAnomaliesSpans],
      },
    };
  } catch (e) {
    throw new Error(e);
  }
}

const parseAnomalyResult = (anomaly: MappedAnomalyHit, jobId: string) => {
  const {
    id,
    anomalyScore,
    typical,
    actual,
    duration,
    influencers,
    startTime: anomalyStartTime,
  } = anomaly;

  return {
    id,
    anomalyScore,
    typical,
    actual,
    duration,
    influencers,
    startTime: anomalyStartTime,
    type: 'metrics_hosts' as const,
    jobId,
  };
};

async function fetchMetricsHostsAnomalies(
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

  const finalizeFetchLogEntryAnomaliesSpan = startTracingSpan('fetch metrics hosts anomalies');

  const results = decodeOrThrow(metricsHostsAnomaliesResponseRT)(
    await mlSystem.mlAnomalySearch(
      createMetricsHostsAnomaliesQuery(jobIds, startTime, endTime, sort, expandedPagination),
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
      influencers,
      bucket_span: duration,
      timestamp: anomalyStartTime,
      by_field_value: categoryId,
    } = result._source;

    const hostInfluencers = influencers.filter((i) => i.influencer_field_name === 'host.name');
    return {
      id: result._id,
      anomalyScore,
      dataset: '',
      typical: typical[0],
      actual: actual[0],
      jobId: job_id,
      influencers: hostInfluencers.reduce(
        (acc: string[], i) => [...acc, ...i.influencer_field_values],
        []
      ),
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
