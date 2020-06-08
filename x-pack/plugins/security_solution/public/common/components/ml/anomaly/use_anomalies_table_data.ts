/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';

import { DEFAULT_ANOMALY_SCORE } from '../../../../../common/constants';
import { anomaliesTableData } from '../api/anomalies_table_data';
import { InfluencerInput, Anomalies, CriteriaFields } from '../types';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { useSiemJobs } from '../../ml_popover/hooks/use_siem_jobs';
import { useMlCapabilities } from '../../ml_popover/hooks/use_ml_capabilities';
import { useStateToaster, errorToToaster } from '../../toasters';

import * as i18n from './translations';
import { useTimeZone, useUiSetting$ } from '../../../lib/kibana';

interface Args {
  influencers?: InfluencerInput[];
  endDate: number;
  startDate: number;
  threshold?: number;
  skip?: boolean;
  criteriaFields?: CriteriaFields[];
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
}: Args): Return => {
  const [tableData, setTableData] = useState<Anomalies | null>(null);
  const [, siemJobs] = useSiemJobs(true);
  const [loading, setLoading] = useState(true);
  const capabilities = useMlCapabilities();
  const userPermissions = hasMlUserPermissions(capabilities);
  const [, dispatchToaster] = useStateToaster();
  const timeZone = useTimeZone();
  const [anomalyScore] = useUiSetting$<number>(DEFAULT_ANOMALY_SCORE);

  const siemJobIds = siemJobs.filter((job) => job.isInstalled).map((job) => job.id);

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
      if (userPermissions && !skip && siemJobIds.length > 0) {
        try {
          const data = await anomaliesTableData(
            {
              jobIds: siemJobIds,
              criteriaFields: criteriaFieldsInput,
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
            errorToToaster({ title: i18n.SIEM_TABLE_FETCH_FAILURE, error, dispatchToaster });
            setLoading(false);
          }
        }
      } else if (!userPermissions && isSubscribed) {
        setLoading(false);
      } else if (siemJobIds.length === 0 && isSubscribed) {
        setLoading(false);
      } else if (isSubscribed) {
        setTableData(null);
        setLoading(true);
      }
    }

    fetchAnomaliesTableData(influencers, criteriaFields, startDate, endDate);
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
    startDate,
    endDate,
    skip,
    userPermissions,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    siemJobIds.sort().join(),
  ]);

  return [loading, tableData];
};
