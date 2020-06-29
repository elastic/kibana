/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAnomalyRecordsAction,
  getMLCapabilitiesAction,
  getMonitorDurationAction,
} from '../../../state/actions';
import {
  anomaliesSelector,
  hasMLFeatureSelector,
  hasMLJobSelector,
  selectDurationLines,
  dateRangeSelector,
} from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { getMLJobId } from '../../../state/api/ml_anomaly';
import { JobStat } from '../../../../../ml/public';
import { MonitorDurationComponent } from './monitor_duration';
import { MonitorIdParam } from '../../../../common/types';
import { useAbsoluteDateRange } from '../../../hooks/use_absolute_date_range';

export const MonitorDuration: React.FC<MonitorIdParam> = ({ monitorId }) => {
  const { from, to } = useSelector(dateRangeSelector);
  const { from: absFrom, to: absTo } = useAbsoluteDateRange();

  const { durationLines, loading } = useSelector(selectDurationLines);

  const isMLAvailable = useSelector(hasMLFeatureSelector);

  const { data: mlJobs, loading: jobsLoading } = useSelector(hasMLJobSelector);

  const hasMLJob =
    !!mlJobs?.jobsExist &&
    !!mlJobs.jobs.find((job: JobStat) => job.id === getMLJobId(monitorId as string));

  const anomalies = useSelector(anomaliesSelector);

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  useEffect(() => {
    if (isMLAvailable) {
      const anomalyParams = {
        listOfMonitorIds: [monitorId],
        dateStart: absFrom,
        dateEnd: absTo,
      };

      dispatch(getAnomalyRecordsAction.get(anomalyParams));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absFrom, absTo, dispatch, lastRefresh, monitorId, isMLAvailable]);

  useEffect(() => {
    const params = { monitorId, dateStart: from, dateEnd: to };
    dispatch(getMonitorDurationAction(params));
  }, [from, to, dispatch, lastRefresh, monitorId]);

  useEffect(() => {
    dispatch(getMLCapabilitiesAction.get());
  }, [dispatch]);

  return (
    <MonitorDurationComponent
      anomalies={anomalies}
      hasMLJob={hasMLJob}
      loading={loading || jobsLoading}
      locationDurationLines={durationLines?.locationDurationLines ?? []}
    />
  );
};
