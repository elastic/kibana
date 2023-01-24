/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import { anomaliesTableData } from '../api/anomalies_table_data';
import type { InfluencerInput, Anomalies, CriteriaFields } from '../types';

import * as i18n from './translations';
import { useTimeZone, useUiSetting$ } from '../../../lib/kibana';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useFetch, REQUEST_NAMES } from '../../../hooks/use_fetch';
import { useMlCapabilities } from '../hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';

interface Args {
  influencers?: InfluencerInput[];
  endDate: string;
  startDate: string;
  threshold?: number;
  skip?: boolean;
  criteriaFields?: CriteriaFields[];
  filterQuery?: estypes.QueryDslQueryContainer;
  jobIds: string[];
  aggregationInterval: string;
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
  jobIds,
  aggregationInterval,
}: Args): Return => {
  const mlCapabilities = useMlCapabilities();
  const isMlUser = hasMlUserPermissions(mlCapabilities);

  const { addError } = useAppToasts();
  const timeZone = useTimeZone();
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const startDateMs = useMemo(() => new Date(startDate).getTime(), [startDate]);
  const endDateMs = useMemo(() => new Date(endDate).getTime(), [endDate]);

  const {
    fetch,
    data = null,
    isLoading,
    error,
  } = useFetch(REQUEST_NAMES.ANOMALIES_TABLE, anomaliesTableData, { disabled: skip });

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.SIEM_TABLE_FETCH_FAILURE });
    }
  }, [error, addError]);

  useEffect(() => {
    if (isMlUser && jobIds.length > 0) {
      fetch({
        jobIds,
        criteriaFields,
        influencersFilterQuery: filterQuery,
        aggregationInterval,
        threshold: getThreshold(anomalyScore, threshold),
        earliestMs: startDateMs,
        latestMs: endDateMs,
        influencers,
        dateFormatTz: timeZone,
        maxRecords: 500,
        maxExamples: 10,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    influencersOrCriteriaToString(influencers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    influencersOrCriteriaToString(criteriaFields),
    startDateMs,
    endDateMs,
    isMlUser,
    aggregationInterval,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    jobIds.sort().join(),
  ]);

  return [isLoading, data];
};
