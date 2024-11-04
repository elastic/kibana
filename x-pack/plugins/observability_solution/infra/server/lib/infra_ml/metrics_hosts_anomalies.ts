/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { InfraRequestHandlerContext } from '../../types';
import { TracingSpan, startTracingSpan } from '../../../common/performance_tracing';
import { fetchMlJob, MappedAnomalyHit, InfluencerFilter } from './common';
import { getJobId, metricsHostsJobTypes } from '../../../common/infra_ml';
import { Sort, Pagination } from '../../../common/http_api/infra_ml';
import type { MlSystem, MlAnomalyDetectors } from '../../types';
import { isMlPrivilegesError } from './errors';
import {
  metricsHostsAnomaliesResponseRT,
  createMetricsHostsAnomaliesQuery,
} from './queries/metrics_hosts_anomalies';

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

export async function getMetricsHostsAnomalies({
  context,
  sourceId,
  anomalyThreshold,
  startTime,
  endTime,
  metric,
  sort,
  pagination,
  influencerFilter,
  query,
}: {
  context: Required<InfraRequestHandlerContext>;
  sourceId: string;
  anomalyThreshold: ML_ANOMALY_THRESHOLD;
  startTime: number;
  endTime: number;
  metric: 'memory_usage' | 'network_in' | 'network_out' | undefined;
  sort: Sort;
  pagination: Pagination;
  influencerFilter?: InfluencerFilter;
  query?: string;
}) {
  const finalizeMetricsHostsAnomaliesSpan = startTracingSpan('get metrics hosts entry anomalies');

  const {
    jobIds,
    timing: { spans: jobSpans },
  } = await getCompatibleAnomaliesJobIds(
    context.spaceId,
    sourceId,
    metric,
    context.mlAnomalyDetectors
  );

  if (jobIds.length === 0) {
    return {
      data: [],
      hasMoreEntries: false,
      timimg: { spans: [] },
    };
  }

  try {
    const {
      anomalies,
      paginationCursors,
      hasMoreEntries,
      timing: { spans: fetchLogEntryAnomaliesSpans },
    } = await fetchMetricsHostsAnomalies(
      context.mlSystem,
      anomalyThreshold,
      jobIds,
      startTime,
      endTime,
      sort,
      pagination,
      influencerFilter,
      query
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
    partitionFieldName,
    partitionFieldValue,
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
    partitionFieldName,
    partitionFieldValue,
  };
};

async function fetchMetricsHostsAnomalies(
  mlSystem: MlSystem,
  anomalyThreshold: ML_ANOMALY_THRESHOLD,
  jobIds: string[],
  startTime: number,
  endTime: number,
  sort: Sort,
  pagination: Pagination,
  influencerFilter?: InfluencerFilter,
  query?: string
) {
  // We'll request 1 extra entry on top of our pageSize to determine if there are
  // more entries to be fetched. This avoids scenarios where the client side can't
  // determine if entries.length === pageSize actually means there are more entries / next page
  // or not.
  const expandedPagination = { ...pagination, pageSize: pagination.pageSize + 1 };

  const finalizeFetchLogEntryAnomaliesSpan = startTracingSpan('fetch metrics hosts anomalies');
  const hostQuery = createMetricsHostsAnomaliesQuery({
    jobIds,
    anomalyThreshold,
    startTime,
    endTime,
    sort,
    pagination: expandedPagination,
    influencerFilter,
    jobQuery: query,
  });
  const results = decodeOrThrow(metricsHostsAnomaliesResponseRT)(
    await mlSystem.mlAnomalySearch(hostQuery, jobIds)
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
      partition_field_value: partitionFieldValue,
      partition_field_name: partitionFieldName,
    } = result._source;

    const hostInfluencers = influencers.filter((i) => i.influencer_field_name === 'host.name');
    return {
      id: result._id,
      anomalyScore,
      dataset: '',
      typical: typical[0],
      actual: actual[0],
      jobId: job_id,
      influencers: hostInfluencers.reduce((acc: string[], i) => {
        acc.push(...i.influencer_field_values);
        return acc;
      }, []),
      startTime: anomalyStartTime,
      duration: duration * 1000,
      categoryId,
      partitionFieldName,
      partitionFieldValue,
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
