/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { getFilteredHostNames, getShouldFetchApmHosts } from './get_filtered_hosts';
import type { GetHostParameters } from '../types';
import { getAllHosts } from './get_all_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';
import { assertQueryStructure, hasFilters } from '../utils';
import { getApmHostNames } from './get_apm_hosts';

export const getHosts = async ({
  metrics,
  from,
  to,
  limit,
  query,
  alertsClient,
  apmDataAccessServices,
  infraMetricsClient,
}: GetHostParameters): Promise<GetInfraMetricsResponsePayload> => {
  const runFilterQuery = hasFilters(query);
  // filter first to prevent filter clauses from impacting the metrics aggregations.
  const hostNames = runFilterQuery
    ? await getHostNames({
        infraMetricsClient,
        apmDataAccessServices,
        from,
        to,
        limit,
        query,
      })
    : [];

  if (runFilterQuery && hostNames.length === 0) {
    return {
      assetType: 'host',
      nodes: [],
    };
  }

  const [hostMetricsResponse, alertsCountResponse] = await Promise.all([
    getAllHosts({
      infraMetricsClient,
      from,
      to,
      limit,
      metrics,
      hostNames,
    }),
    getHostsAlertsCount({
      alertsClient,
      hostNames,
      from,
      to,
      limit,
    }),
  ]);

  const alertsByHostName = alertsCountResponse.reduce((acc, { name, alertsCount }) => {
    acc[name] = { alertsCount };
    return acc;
  }, {} as Record<string, { alertsCount: number }>);

  const hosts = hostMetricsResponse.map((host) => {
    const { alertsCount } = alertsByHostName[host.name] ?? {};
    return {
      ...host,
      alertsCount,
    };
  });

  return {
    assetType: 'host',
    nodes: hosts,
  };
};

const getHostNames = async ({
  infraMetricsClient,
  apmDataAccessServices,
  from,
  to,
  limit,
  query,
}: Pick<
  GetHostParameters,
  'apmDataAccessServices' | 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'query'
>) => {
  assertQueryStructure(query);

  const shouldFetchApmHosts = await getShouldFetchApmHosts({
    infraMetricsClient,
    from,
    to,
    query,
  });

  // If the query contains fields not shipped by the system module, it will try to find matches in APM Docs
  return shouldFetchApmHosts && apmDataAccessServices
    ? getApmHostNames({
        apmDataAccessServices,
        query,
        from,
        to,
        limit,
      })
    : getFilteredHostNames({
        infraMetricsClient,
        query,
        from,
        to,
        limit,
      });
};
