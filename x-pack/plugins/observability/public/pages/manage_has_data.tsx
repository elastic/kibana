/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useContext, useEffect } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { ObsvSharedContext } from '../context/shared_data';
import {
  useApmHasData,
  useInfraLogsHasData,
  useInfraMetricsHasData,
  useUptimeHasData,
  useUXHasData,
} from '../hooks/has_data_hooks';
import { useQueryParams } from '../hooks/use_query_params';

export function ManageHasDataFetches() {
  const { setSharedData } = useContext(ObsvSharedContext);

  const history = useHistory();

  const { absStart, absEnd } = useQueryParams();

  const { data: logs, status: logsStatus } = useInfraLogsHasData();
  const { data: metrics, status: metricsStatus } = useInfraMetricsHasData();
  const { data: apm, status: apmStatus } = useApmHasData();
  const { data: uptime, status: uptimeStatus } = useUptimeHasData();
  const { data: ux, status: uxStatus } = useUXHasData({ start: absStart, end: absEnd });

  const isOverViewPage = useRouteMatch('/overview');

  useEffect(() => {
    const hasAnyData = logs || metrics || apm || uptime || ux;

    if (!isOverViewPage) {
      if (hasAnyData) {
        history.push({ pathname: '/overview' });
      } else if (
        logsStatus === 'success' &&
        metricsStatus === 'success' &&
        apmStatus === 'success' &&
        uxStatus === 'success' &&
        uptimeStatus === 'success'
      ) {
        history.push({ pathname: '/landing' });
      }
    }

    const hasData = {
      apm,
      uptime,
      ux,
      infra_logs: logs,
      infra_metrics: metrics,
    };

    setSharedData({ hasData, hasAnyData });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, metrics, apm, uptime, ux, history]);

  return null;
}
