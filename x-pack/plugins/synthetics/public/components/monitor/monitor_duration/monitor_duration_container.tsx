/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { JobStat } from '@kbn/ml-plugin/public';
import { createExploratoryViewUrl } from '@kbn/observability-plugin/public';
import { useGetUrlParams } from '../../../hooks';
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
} from '../../../state/selectors';
import { UptimeRefreshContext } from '../../../contexts';
import { MonitorDurationComponent } from './monitor_duration';
import { MonitorIdParam } from '../../../../common/types';
import { getMLJobId } from '../../../../common/lib';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const MonitorDuration: React.FC<MonitorIdParam> = ({ monitorId }) => {
  const { dateRangeStart, dateRangeEnd, absoluteDateRangeStart, absoluteDateRangeEnd } =
    useGetUrlParams();

  const { durationLines, loading } = useSelector(selectDurationLines);

  const isMLAvailable = useSelector(hasMLFeatureSelector);

  const { data: mlJobs, loading: jobsLoading } = useSelector(hasMLJobSelector);

  const hasMLJob =
    !!mlJobs?.jobsExist &&
    !!mlJobs.jobs.find((job: JobStat) => job.id === getMLJobId(monitorId as string));

  const anomalies = useSelector(anomaliesSelector);

  const dispatch = useDispatch();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { basePath } = useUptimeSettingsContext();

  const exploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          name: `${monitorId}-response-duration`,
          time: { from: dateRangeStart, to: dateRangeEnd },
          reportDefinitions: {
            'monitor.id': [monitorId] as string[],
          },
          breakdown: 'observer.geo.name',
          operationType: 'average',
          dataType: 'synthetics',
        },
      ],
    },
    basePath
  );

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
    const params = { monitorId, dateStart: dateRangeStart, dateEnd: dateRangeEnd };
    dispatch(getMonitorDurationAction(params));
  }, [dateRangeStart, dateRangeEnd, dispatch, lastRefresh, monitorId]);

  useEffect(() => {
    dispatch(getMLCapabilitiesAction.get());
  }, [dispatch]);

  return (
    <MonitorDurationComponent
      anomalies={anomalies}
      hasMLJob={hasMLJob}
      loading={loading || jobsLoading}
      exploratoryViewLink={exploratoryViewLink}
      locationDurationLines={durationLines?.locationDurationLines ?? []}
    />
  );
};
