/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import { filter, head, orderBy, pipe, has } from 'lodash/fp';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import * as i18n from './translations';
import { useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { notableAnomaliesSearch } from '../api/anomalies_search';
import type { NotableAnomaliesJobId } from '../../../../overview/components/entity_analytics/anomalies/config';
import { NOTABLE_ANOMALIES_IDS } from '../../../../overview/components/entity_analytics/anomalies/config';
import { getAggregatedAnomaliesQuery } from '../../../../overview/components/entity_analytics/anomalies/query';
import type { inputsModel } from '../../../store';
import { useSecurityJobs } from '../../ml_popover/hooks/use_security_jobs';
import type { SecurityJob } from '../../ml_popover/types';

export enum AnomalyEntity {
  User,
  Host,
}

export interface AnomaliesCount {
  name: NotableAnomaliesJobId;
  count: number;
  entity: AnomalyEntity;
  job?: SecurityJob;
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

  const { notableAnomaliesJobs, query } = useMemo(() => {
    const newNotableAnomaliesJobs = securityJobs.filter(({ id }) =>
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
  }, [securityJobs, anomalyScoreThreshold, from, to]);

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
            jobIds: notableAnomaliesJobs.filter((job) => job.isInstalled).map(({ id }) => id),
            query,
          },
          abortCtrl.signal
        );

        if (isSubscribed) {
          setLoading(false);
          const buckets = response.aggregations?.number_of_anomalies.buckets ?? [];
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

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [skip, isMlUser, addError, query, notableAnomaliesJobs, refetchJobs]);

  return { isLoading: loading || jobsLoading, data, refetch: refetchJobs };
};

function formatResultData(
  buckets: Array<{
    key: string;
    doc_count: number;
  }>,
  notableAnomaliesJobs: SecurityJob[]
): AnomaliesCount[] {
  return NOTABLE_ANOMALIES_IDS.map((notableJobId) => {
    const job = findJobWithId(notableJobId)(notableAnomaliesJobs);
    const bucket = buckets.find(({ key }) => key === job?.id);
    const hasUserName = has("entity.hits.hits[0]._source['user.name']", bucket);

    return {
      name: notableJobId,
      count: bucket?.doc_count ?? 0,
      entity: hasUserName ? AnomalyEntity.User : AnomalyEntity.Host,
      job,
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
  pipe<SecurityJob[][], SecurityJob[], SecurityJob[], SecurityJob | undefined>(
    filter<SecurityJob>(({ id }) => matchJobId(id, notableJobId)),
    orderBy<SecurityJob>('latestTimestampSortValue', 'desc'),
    head
  );
