/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUrlParams } from '../../../hooks';
import { getAnomalyRecordsAction, getMLCapabilitiesAction } from '../../../state/actions';
import {
  anomaliesSelector,
  hasMLFeatureSelector,
  hasMLJobSelector,
} from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { JobStat } from '../../../../../ml/public';
import { MonitorDurationComponent } from './monitor_duration';
import { MonitorIdParam } from '../../../../common/types';
import { getMLJobId } from '../../../../common/lib';
import { createExploratoryViewUrl, AllSeries } from '../../../../../observability/public';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const MonitorDuration: React.FC<MonitorIdParam> = ({ monitorId }) => {
  const {
    dateRangeStart,
    dateRangeEnd,
    absoluteDateRangeStart,
    absoluteDateRangeEnd,
  } = useGetUrlParams();

  const isMLAvailable = useSelector(hasMLFeatureSelector);

  const { data: mlJobs, loading: jobsLoading } = useSelector(hasMLJobSelector);

  const hasMLJob =
    !!mlJobs?.jobsExist &&
    !!mlJobs.jobs.find((job: JobStat) => job.id === getMLJobId(monitorId as string));

  const anomalies = useSelector(anomaliesSelector);

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { basePath } = useUptimeSettingsContext();

  const exploratoryViewAttributes: AllSeries = {
    [`monitor-duration`]: {
      reportType: 'upd',
      time: { from: dateRangeStart, to: dateRangeEnd },
      reportDefinitions: {
        'monitor.id': [monitorId] as string[],
      },
      breakdown: 'observer.geo.name',
      operationType: 'average',
      dataType: 'synthetics',
    },
  };

  const exploratoryViewLink = createExploratoryViewUrl(exploratoryViewAttributes, basePath);

  useEffect(() => {
    if (isMLAvailable) {
      const anomalyParams = {
        listOfMonitorIds: [monitorId],
        dateStart: absoluteDateRangeStart,
        dateEnd: absoluteDateRangeEnd,
      };

      dispatch(getAnomalyRecordsAction.get(anomalyParams));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRangeStart, dateRangeEnd, dispatch, lastRefresh, monitorId, isMLAvailable]);

  useEffect(() => {
    dispatch(getMLCapabilitiesAction.get());
  }, [dispatch]);

  return (
    <MonitorDurationComponent
      anomalies={anomalies}
      hasMLJob={hasMLJob}
      loading={jobsLoading}
      exploratoryViewLink={exploratoryViewLink}
      exploratoryViewAttributes={exploratoryViewAttributes}
    />
  );
};
