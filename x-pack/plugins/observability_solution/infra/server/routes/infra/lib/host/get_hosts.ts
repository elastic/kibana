/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import type { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { getFilteredHostNames, getHasDataFromSystemIntegration } from './get_filtered_hosts';
import type { GetHostParameters } from '../types';
import { getAllHosts } from './get_all_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';
import { assertQueryStructure } from '../utils';
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
  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  const hostNames = await getHostNames({
    infraMetricsClient,
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    limit,
    query,
  });

  if (hostNames.length === 0) {
    return {
      assetType: 'host',
      nodes: [],
    };
  }

  const [hostMetricsResponse, alertsCountResponse] = await Promise.all([
    getAllHosts({
      infraMetricsClient,
      apmDataAccessServices,
      apmDocumentSources,
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
  apmDocumentSources,
  from,
  to,
  limit,
  query,
}: Pick<
  GetHostParameters,
  'apmDataAccessServices' | 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'query'
> & {
  apmDocumentSources?: TimeRangeMetadata['sources'];
}) => {
  assertQueryStructure(query);

  const hasSystemIntegrationData = await getHasDataFromSystemIntegration({
    infraMetricsClient,
    from,
    to,
    query,
  });

  const [monitoredHosts, apmHosts] = await Promise.all([
    hasSystemIntegrationData
      ? getFilteredHostNames({
          infraMetricsClient,
          query,
          from,
          to,
          limit,
        })
      : undefined,
    apmDataAccessServices && apmDocumentSources
      ? getApmHostNames({
          apmDataAccessServices,
          apmDocumentSources,
          query,
          from,
          to,
          limit,
        })
      : undefined,
  ]);

  return [...new Set([...(monitoredHosts ?? []), ...(apmHosts ?? [])])];
};
