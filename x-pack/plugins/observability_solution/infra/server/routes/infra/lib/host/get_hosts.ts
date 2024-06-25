/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { getFilteredHosts } from './get_filtered_hosts';
import { hasFilters } from '../utils';
import type { GetHostsArgs } from '../types';
import { getAllHosts } from './get_all_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';

export const getHosts = async (args: GetHostsArgs): Promise<GetInfraMetricsResponsePayload> => {
  const runFilterQuery = hasFilters(args.params.query);
  // filter first to prevent filter clauses from impacting the metrics aggregations.
  const hostNamesShortList = runFilterQuery ? await getFilteredHostNames(args) : [];
  if (runFilterQuery && hostNamesShortList.length === 0) {
    return {
      type: 'host',
      nodes: [],
    };
  }

  const {
    range: { from, to },
    limit,
  } = args.params;

  const [hostMetrics, alertsCountResponse] = await Promise.all([
    getAllHosts(args, hostNamesShortList),
    getHostsAlertsCount({
      alertsClient: args.alertsClient,
      hostNamesShortList,
      from,
      to,
      maxNumHosts: limit,
    }),
  ]);

  const alertsByHostName = alertsCountResponse.reduce((acc, { name, alertsCount }) => {
    acc[name] = { alertsCount };
    return acc;
  }, {} as Record<string, { alertsCount: number }>);

  const hosts = hostMetrics.map(({ name, metrics, metadata }) => {
    const { alertsCount } = alertsByHostName[name] ?? {};
    return { name, metrics, metadata, alertsCount };
  });

  return {
    type: args.params.type,
    nodes: hosts,
  };
};

const getFilteredHostNames = async (args: GetHostsArgs) => {
  const filteredHosts = await getFilteredHosts(args);

  const { nodes } = filteredHosts.aggregations ?? {};
  return nodes?.buckets.map((p) => p.key as string) ?? [];
};
