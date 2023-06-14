/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import { has, sortBy } from 'lodash/fp';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { anomaliesSearch } from '../api/anomalies_search';
import { getAggregatedAnomaliesQuery } from '../../../../overview/components/entity_analytics/anomalies/query';
import type { inputsModel } from '../../../store';
import { useSecurityJobs } from '../../ml_popover/hooks/use_security_jobs';
import type { SecurityJob } from '../../ml_popover/types';

export enum AnomalyEntity {
  User,
  Host,
}

export interface AnomaliesCount {
  name: string;
  count: number;
  entity: AnomalyEntity;
  job?: SecurityJob;
}

interface UseAggregatedAnomaliesByJobProps {
  skip: boolean;
  from: string;
  to: string;
}

export const useAggregatedAnomaliesByJob = ({
  skip,
  from,
  to,
}: UseAggregatedAnomaliesByJobProps): {
  isLoading: boolean;
  data: AnomaliesCount[];
  refetch: inputsModel.Refetch;
} => {
  const [data, setData] = useState<AnomaliesCount[]>([]);

  const {
    loading: jobsLoading,
    isMlAdmin: isMlUser,
    jobs: securityJobs,
    refetch: refetchJobs,
  } = useSecurityJobs();

  const [loading, setLoading] = useState(true);
  const { addError } = useAppToasts();
  const [anomalyScoreThreshold] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const { query } = useMemo(
    () => ({
      query: getAggregatedAnomaliesQuery({
        jobIds: securityJobs.map(({ id }) => id),
        anomalyScoreThreshold,
        from,
        to,
      }),
    }),
    [securityJobs, anomalyScoreThreshold, from, to]
  );

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchAnomaliesSearch() {
      if (!isSubscribed) return;

      if (skip || !isMlUser || securityJobs.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await anomaliesSearch(
          {
            jobIds: securityJobs.filter((job) => job.isInstalled).map(({ id }) => id),
            query,
          },
          abortCtrl.signal
        );

        if (isSubscribed) {
          setLoading(false);
          const buckets = response.aggregations?.number_of_anomalies.buckets ?? [];
          setData(formatResultData(buckets, securityJobs));
        }
      } catch (error) {
        if (isSubscribed && error.name !== 'AbortError') {
          addError(error, { title: i18n.SIEM_TABLE_FETCH_FAILURE });
          setLoading(false);
        }
      }
    }

    fetchAnomaliesSearch();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [skip, isMlUser, addError, query, securityJobs, refetchJobs]);

  return { isLoading: loading || jobsLoading, data, refetch: refetchJobs };
};

function formatResultData(
  buckets: Array<{
    key: string;
    doc_count: number;
  }>,
  anomaliesJobs: SecurityJob[]
): AnomaliesCount[] {
  const unsortedAnomalies: AnomaliesCount[] = anomaliesJobs.map((job) => {
    const bucket = buckets.find(({ key }) => key === job?.id);
    const hasUserName = has("entity.hits.hits[0]._source['user.name']", bucket);

    return {
      name: job?.customSettings?.security_app_display_name ?? job.id,
      count: bucket?.doc_count ?? 0,
      entity: hasUserName ? AnomalyEntity.User : AnomalyEntity.Host,
      job,
    };
  });

  return sortBy(['name'], unsortedAnomalies);
}
