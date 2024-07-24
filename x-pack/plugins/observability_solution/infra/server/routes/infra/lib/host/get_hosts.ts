/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { getFilteredHosts } from './get_filtered_hosts';
import type { GetHostParameters } from '../types';
import { getAllHosts } from './get_all_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';
import { assertQueryStructure, hasFilters } from '../utils';

export const getHosts = async ({
  metrics,
  from,
  to,
  limit,
  type,
  query,
  alertsClient,
  apmDataAccess,
  infraMetricsClient,
}: Omit<GetHostParameters, 'sourceId'>): Promise<GetInfraMetricsResponsePayload> => {
  const runFilterQuery = hasFilters(query);
  // filter first to prevent filter clauses from impacting the metrics aggregations.
  const hostNamesShortList = runFilterQuery
    ? await getFilteredHostNames({
        infraMetricsClient,
        apmDataAccess,
        from,
        to,
        limit,
        query,
      })
    : [];

  if (runFilterQuery && hostNamesShortList.length === 0) {
    return {
      type: 'host',
      nodes: [],
    };
  }

  const [hostMetrics, alertsCountResponse] = await Promise.all([
    getAllHosts({
      infraMetricsClient,
      from,
      to,
      limit,
      type,
      metrics,
      hostNamesShortList,
    }),
    getHostsAlertsCount({
      alertsClient,
      hostNamesShortList,
      from,
      to,
      limit,
    }),
  ]);

  const alertsByHostName = alertsCountResponse.reduce((acc, { name, alertsCount }) => {
    acc[name] = { alertsCount };
    return acc;
  }, {} as Record<string, { alertsCount: number }>);

  const hosts = hostMetrics.map((item) => {
    const { alertsCount } = alertsByHostName[item.name] ?? {};
    return { name: item.name, metrics: item.metrics, metadata: item.metadata, alertsCount };
  });

  return {
    type,
    nodes: hosts,
  };
};

const getFilteredHostNames = async ({
  infraMetricsClient,
  apmDataAccess,
  from,
  to,
  limit,
  query,
}: Pick<
  GetHostParameters,
  'apmDataAccess' | 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'query'
>) => {
  assertQueryStructure(query);

  const [hosts, apmHosts] = await Promise.all([
    getFilteredHosts({
      infraMetricsClient,
      query,
      from,
      to,
      limit,
    }),
    apmDataAccess.services.getHostNames({
      query,
      from: new Date(from).getTime(),
      to: new Date(to).getTime(),
      limit,
    }),
  ]);

  return [...new Set([...hosts, ...apmHosts])];
};
