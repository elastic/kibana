/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { getFilteredHosts } from './get_filtered_hosts';
import { mapToApiResponse } from '../mapper';
import { hasFilters } from '../utils';
import { GetHostsArgs } from '../types';
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

  const [result, alertsCountResponse] = await Promise.all([
    getAllHosts(args, hostNamesShortList),
    getHostsAlertsCount({
      alertsClient: args.alertsClient,
      hostNamesShortList,
      from,
      to,
      maxNumHosts: limit,
    }),
  ]);

  return mapToApiResponse(args.params, result?.nodes.buckets, alertsCountResponse);
};

const getFilteredHostNames = async (args: GetHostsArgs) => {
  const filteredHosts = await getFilteredHosts(args);

  const { nodes } = filteredHosts ?? {};
  return nodes?.buckets.map((p) => p.key) ?? [];
};
