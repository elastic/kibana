/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { ObservabilityApp } from '../../../typings/common';
import { getDataHandler } from '../../data_handler';
import { useFetcher } from '../../hooks/use_fetcher';

const fetchData = async (): Promise<Record<ObservabilityApp, boolean | undefined>> => {
  const apmPromise = getDataHandler('apm')?.hasData();
  const uptimePromise = getDataHandler('uptime')?.hasData();
  const logsPromise = getDataHandler('infra_logs')?.hasData();
  const metricsPromise = getDataHandler('infra_metrics')?.hasData();
  const [apm, uptime, logs, metrics] = await Promise.all([
    apmPromise,
    uptimePromise,
    logsPromise,
    metricsPromise,
  ]);
  return { apm, uptime, infra_logs: logs, infra_metrics: metrics };
};

export const Home = () => {
  const history = useHistory();
  const { data = {} } = useFetcher(fetchData, []);

  const values = Object.values(data);
  const hasSomeData = values.length ? values.some((hasData) => hasData) : null;

  if (hasSomeData === true) {
    history.push({ pathname: '/overview', state: { hasData: data } });
  }
  if (hasSomeData === false) {
    history.push({ pathname: '/start' });
  }

  return <></>;
};
