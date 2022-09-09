/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { filter, head, noop, orderBy, pipe, has } from 'lodash/fp';
import type { MlSummaryJob } from '@kbn/ml-plugin/common';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useInstalledSecurityJobs } from '../hooks/use_installed_security_jobs';
import { notableAnomaliesSearch } from '../api/anomalies_search';
import type { NotableAnomaliesJobId } from '../../../../overview/components/entity_analytics/anomalies/config';
import { NOTABLE_ANOMALIES_IDS } from '../../../../overview/components/entity_analytics/anomalies/config';
import { getAggregatedAnomaliesQuery } from '../../../../overview/components/entity_analytics/anomalies/query';
import type { inputsModel } from '../../../store';
import { isJobFailed, isJobStarted } from '../../../../../common/machine_learning/helpers';

export enum AnomalyJobStatus {
  'enabled',
  'disabled',
  'uninstalled',
  'failed',
}

export const enum AnomalyEntity {
  User,
  Host,
}

export interface AnomaliesCount {
  name: NotableAnomaliesJobId;
  jobId?: string;
  count: number;
  status: AnomalyJobStatus;
  entity: AnomalyEntity;
}

interface UseNotableAnomaliesSearchProps {
  skip: boolean;
  from: string;
  to: string;
}

export const useNotableAnomaliesSearch = ({
  skip,
  from,
  to,
}: UseNotableAnomaliesSearchProps): {
  isLoading: boolean;
  data: AnomaliesCount[];
  refetch: inputsModel.Refetch;
} => {
  const [data, setData] = useState<AnomaliesCount[]>(formatResultData([], []));
  const refetch = useRef<inputsModel.Refetch>(noop);

  const {
    loading: installedJobsLoading,
    isMlUser,
    jobs: installedSecurityJobs,
  } = useInstalledSecurityJobs();
  const [loading, setLoading] = useState(true);
  const { addError } = useAppToasts();
  const [anomalyScoreThreshold] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const { notableAnomaliesJobs, query } = useMemo(() => {
    const newNotableAnomaliesJobs = installedSecurityJobs.filter(({ id }) =>
      NOTABLE_ANOMALIES_IDS.some((notableJobId) => matchJobId(id, notableJobId))
    );

    const newQuery = getAggregatedAnomaliesQuery({
      jobIds: newNotableAnomaliesJobs.map(({ id }) => id),
      anomalyScoreThreshold,
      from,
      to,
    });

    return {
      query: newQuery,
      notableAnomaliesJobs: newNotableAnomaliesJobs,
    };
  }, [installedSecurityJobs, anomalyScoreThreshold, from, to]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchAnomaliesSearch() {
      if (!isSubscribed) return;

      if (skip || !isMlUser || notableAnomaliesJobs.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await notableAnomaliesSearch(
          {
            jobIds: notableAnomaliesJobs.map(({ id }) => id),
            query,
          },
          abortCtrl.signal
        );

        if (isSubscribed) {
          setLoading(false);
          const buckets = response.aggregations.number_of_anomalies.buckets;
          setData(formatResultData(buckets, notableAnomaliesJobs));
        }
      } catch (error) {
        if (isSubscribed && error.name !== 'AbortError') {
          addError(error, { title: i18n.SIEM_TABLE_FETCH_FAILURE });
          setLoading(false);
        }
      }
    }

    fetchAnomaliesSearch();
    refetch.current = fetchAnomaliesSearch;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [skip, isMlUser, addError, query, notableAnomaliesJobs]);

  return { isLoading: loading || installedJobsLoading, data, refetch: refetch.current };
};

const getMLJobStatus = (
  notableJobId: NotableAnomaliesJobId,
  job: MlSummaryJob | undefined,
  notableAnomaliesJobs: MlSummaryJob[]
) => {
  if (job) {
    if (isJobStarted(job.jobState, job.datafeedState)) {
      return AnomalyJobStatus.enabled;
    }
    if (isJobFailed(job.jobState, job.datafeedState)) {
      return AnomalyJobStatus.failed;
    }
  }
  return notableAnomaliesJobs.some(({ id }) => matchJobId(id, notableJobId))
    ? AnomalyJobStatus.disabled
    : AnomalyJobStatus.uninstalled;
};

function formatResultData(
  buckets: Array<{
    key: string;
    doc_count: number;
  }>,
  notableAnomaliesJobs: MlSummaryJob[]
): AnomaliesCount[] {
  return NOTABLE_ANOMALIES_IDS.map((notableJobId) => {
    const job = findJobWithId(notableJobId)(notableAnomaliesJobs);
    const bucket = buckets.find(({ key }) => key === job?.id);
    const hasUserName = has("entity.hits.hits[0]._source['user.name']", bucket);

    return {
      name: notableJobId,
      jobId: job?.id,
      count: bucket?.doc_count ?? 0,
      status: getMLJobStatus(notableJobId, job, notableAnomaliesJobs),
      entity: hasUserName ? AnomalyEntity.User : AnomalyEntity.Host,
    };
  });
}

/**
 * ML module allows users to add a prefix to the job id.
 * So we need to match jobs that end with the notableJobId.
 */
const matchJobId = (jobId: string, notableJobId: NotableAnomaliesJobId) =>
  jobId.endsWith(notableJobId);

/**
 * When multiple jobs match a notable job id, it returns the most recent one.
 */
const findJobWithId = (notableJobId: NotableAnomaliesJobId) =>
  pipe<MlSummaryJob[][], MlSummaryJob[], MlSummaryJob[], MlSummaryJob | undefined>(
    filter<MlSummaryJob>(({ id }) => matchJobId(id, notableJobId)),
    orderBy<MlSummaryJob>('latestTimestampSortValue', 'desc'),
    head
  );
