/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import { anomaliesTableData } from '../api/anomalies_table_data';
import { InfluencerInput, Anomalies, CriteriaFields } from '../types';

import * as i18n from './translations';
import { useTimeZone, useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useInstalledSecurityJobs } from '../hooks/use_installed_security_jobs';

interface Args {
  influencers?: InfluencerInput[];
  endDate: string;
  startDate: string;
  threshold?: number;
  skip?: boolean;
  criteriaFields?: CriteriaFields[];
  filterQuery?: estypes.QueryDslQueryContainer;
}

type Return = [boolean, Anomalies | null];

export const influencersOrCriteriaToString = (
  influencers: InfluencerInput[] | CriteriaFields[]
): string =>
  influencers == null
    ? ''
    : influencers.reduce((accum, item) => `${accum}${item.fieldName}:${item.fieldValue}`, '');

export const getThreshold = (anomalyScore: number | undefined, threshold: number): number => {
  if (threshold !== -1) {
    return threshold;
  } else if (anomalyScore == null) {
    return 50;
  } else if (anomalyScore < 0) {
    return 0;
  } else if (anomalyScore > 100) {
    return 100;
  } else {
    return Math.floor(anomalyScore);
  }
};

export const useAnomaliesTableData = ({
  criteriaFields = [],
  influencers = [],
  startDate,
  endDate,
  threshold = -1,
  skip = false,
  filterQuery,
}: Args): Return => {
  const [tableData, setTableData] = useState<Anomalies | null>(null);
  const { isMlUser, jobs } = useInstalledSecurityJobs();
  const [loading, setLoading] = useState(true);
  const { addError } = useAppToasts();
  const timeZone = useTimeZone();
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const jobIds = jobs.map((job) => job.id);
  const startDateMs = useMemo(() => new Date(startDate).getTime(), [startDate]);
  const endDateMs = useMemo(() => new Date(endDate).getTime(), [endDate]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchAnomaliesTableData(
      influencersInput: InfluencerInput[],
      criteriaFieldsInput: CriteriaFields[],
      earliestMs: number,
      latestMs: number
    ) {
      if (skip) {
        setLoading(false);
      } else if (isMlUser && !skip && jobIds.length > 0) {
        try {
          const data = await anomaliesTableData(
            {
              jobIds,
              criteriaFields: criteriaFieldsInput,
              influencersFilterQuery: filterQuery,
              aggregationInterval: 'auto',
              threshold: getThreshold(anomalyScore, threshold),
              earliestMs,
              latestMs,
              influencers: influencersInput,
              dateFormatTz: timeZone,
              maxRecords: 500,
              maxExamples: 10,
            },
            abortCtrl.signal
          );
          if (isSubscribed) {
            setTableData(data);
            setLoading(false);
          }
        } catch (error) {
          if (isSubscribed) {
            addError(error, { title: i18n.SIEM_TABLE_FETCH_FAILURE });
            setLoading(false);
          }
        }
      } else if (!isMlUser && isSubscribed) {
        setLoading(false);
      } else if (jobIds.length === 0 && isSubscribed) {
        setLoading(false);
      } else if (isSubscribed) {
        setTableData(null);
        setLoading(true);
      }
    }

    fetchAnomaliesTableData(influencers, criteriaFields, startDateMs, endDateMs);
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    influencersOrCriteriaToString(influencers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    influencersOrCriteriaToString(criteriaFields),
    startDateMs,
    endDateMs,
    skip,
    isMlUser,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    jobIds.sort().join(),
  ]);

  return [loading, tableData];
};
