/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { noop } from 'lodash/fp';
import type { MlSummaryJob } from '@kbn/ml-plugin/common';
import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';

import * as i18n from './translations';
import { useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useInstalledSecurityJobs } from '../hooks/use_installed_security_jobs';
import { notableAnomaliesSearch } from '../api/anomalies_search';
import type { NotableAnomaliesJobId } from '../../../../overview/components/entity_analytics/anomalies/config';
import {
  NOTABLE_ANOMALIES_CONFIG,
  NOTABLE_ANOMALIES_IDS,
} from '../../../../overview/components/entity_analytics/anomalies/config';
import { getAggregatedAnaomaliesQuery } from '../../../../overview/components/entity_analytics/anomalies/query';
import type { inputsModel } from '../../../store';
import { isJobFailed, isJobStarted } from '../../../../../common/machine_learning/helpers';

type AnomalyJobStatus = 'enabled' | 'disabled' | 'uninstalled' | 'failed';

export interface AnomaliesCount {
  jobId: NotableAnomaliesJobId;
  name: string;
  count: number;
  status: AnomalyJobStatus;
}

interface UseNotableAnomaliesSearchSearchProps {
  skip: boolean;
  from: string;
  to: string;
}

export const useNotableAnomaliesSearchSearch = ({
  skip,
  from,
  to,
}: UseNotableAnomaliesSearchSearchProps): {
  isLoading: boolean;
  data: AnomaliesCount[];
  refetch: inputsModel.Refetch;
} => {
  const [data, setData] = useState<AnomaliesCount[]>([]);
  const refetch = useRef<inputsModel.Refetch>(noop);

  const {
    loading: installedJobsLoading,
    isMlUser,
    jobs: installedSecurityJobs,
  } = useInstalledSecurityJobs();
  const [loading, setLoading] = useState(true);
  const { addError } = useAppToasts();
  const [anomalyScoreThreshhold] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const { filteredJobs, query, filteredJobIds } = useMemo(() => {
    const newFilteredJobs = installedSecurityJobs.filter(({ id }) =>
      NOTABLE_ANOMALIES_IDS.includes(id as NotableAnomaliesJobId)
    );

    const newFilteredJobIds = newFilteredJobs.map(({ id }) => id);

    const newQuery = getAggregatedAnaomaliesQuery({
      jobIds: newFilteredJobIds,
      anomalyScoreThreshhold: anomalyScoreThreshhold ?? 50,
      from,
      to,
    });

    return { query: newQuery, filteredJobs: newFilteredJobs, filteredJobIds: newFilteredJobIds };
  }, [installedSecurityJobs, anomalyScoreThreshhold, from, to]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchAnomaliesSearch() {
      if (skip || !isMlUser || filteredJobs.length === 0) {
        if (isSubscribed) {
          setLoading(false);
        }
      } else {
        setLoading(true);
        try {
          const response = await notableAnomaliesSearch(
            {
              jobIds: filteredJobIds,
              query,
            },
            abortCtrl.signal
          );

          if (isSubscribed) {
            setLoading(false);
            const buckets = response.aggregations.number_of_anomalies.buckets;

            const resultData = NOTABLE_ANOMALIES_IDS.map((jobId) => {
              const bucket = buckets.find(({ key }) => jobId === key);

              const job = filteredJobs.find(({ id }) => id === jobId);

              const status: AnomalyJobStatus = getMLJobStatus(jobId, job, filteredJobIds);

              return {
                jobId,
                name: NOTABLE_ANOMALIES_CONFIG[jobId].name,
                count: bucket?.doc_count ?? 0,
                status,
              };
            });

            setData(resultData);
          }
        } catch (error) {
          if (isSubscribed && error.name !== 'AbortError') {
            addError(error, { title: i18n.SIEM_TABLE_FETCH_FAILURE });
            setLoading(false);
          }
        }
      }
    }
    fetchAnomaliesSearch();
    refetch.current = fetchAnomaliesSearch;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [skip, isMlUser, addError, query, filteredJobIds, filteredJobs]);

  return { isLoading: loading || installedJobsLoading, data, refetch: refetch.current };
};

const getMLJobStatus = (jobId: string, job: MlSummaryJob | undefined, filteredJobIds: string[]) => {
  if (job) {
    if (isJobStarted(job.jobState, job.datafeedState)) {
      return 'enabled';
    }
    if (isJobFailed(job.jobState, job.datafeedState)) {
      return 'failed';
    }
  }

  return filteredJobIds.includes(jobId) ? 'disabled' : 'uninstalled';
};
