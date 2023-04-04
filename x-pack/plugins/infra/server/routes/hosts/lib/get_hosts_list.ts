/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetHostsRequestParams, GetHostsResponsePayload } from '../../../../common/http_api/hosts';
import { getFilteredHosts } from './get_filtered_hosts';
import { mapToApiResponse } from './map_to_response';
import { hasFilters, hasSortByMetric } from './utils';

import { GetHostsArgs } from './types';
import { getTopHostsByMetric } from './get_top_hosts';
import { getHostMetrics } from './get_hosts_metrics';

export const getHostsList = async (args: GetHostsArgs): Promise<GetHostsResponsePayload> => {
  const runFilterQuery = hasFilters(args.params.query);
  const filteredHostNames = runFilterQuery ? await getFilteredHostNames(args) : [];
  if (runFilterQuery && filteredHostNames.length === 0) {
    return {
      hosts: [],
    };
  }

  // Unfortunately, terms aggregation sorts null buckets first when direction is desc
  // That's why this query is executed to first retrieve all host sorted by metric,
  // considering only those which contain the necessary metric fields in the docs, filtering out
  // null aggregations
  const topHostNamesByMetric = await getTopHostNamesByMetric(args);
  const result = await getHostMetrics(args, filteredHostNames, topHostNamesByMetric);

  return {
    hosts: combine(
      {
        sortedByMetric: mapToApiResponse(args.params, result?.sortedByMetric),
        sortedByTerm: mapToApiResponse(args.params, result?.sortedByTerm),
      },
      args.params
    ),
  };
};

const combine = (
  result: {
    sortedByTerm?: GetHostsResponsePayload;
    sortedByMetric?: GetHostsResponsePayload;
  },
  params: GetHostsRequestParams
): GetHostsResponsePayload['hosts'] => {
  const { sortedByTerm, sortedByMetric } = result;

  if (sortedByTerm && sortedByTerm?.hosts.length === params.limit) {
    return sortedByTerm.hosts;
  }

  // Sometimes sortedByMetric won't reach the limit.
  // Here we complete it with the hosts sorted by term.
  // This also makes sure that aggregations with null will be wither at the top or at the bottom of the list
  // Depending on the sorting direction
  const combined =
    !params.sortDirection || params.sortDirection === 'asc'
      ? [...(sortedByTerm?.hosts ?? []), ...(sortedByMetric?.hosts ?? [])]
      : [...(sortedByMetric?.hosts ?? []), ...(sortedByTerm?.hosts ?? [])];

  return combined;
};

const getTopHostNamesByMetric = async (args: GetHostsArgs, filteredHostNames: string[] = []) => {
  if (!hasSortByMetric(args.params)) {
    return [];
  }

  const sortedHostsByMetric = await getTopHostsByMetric(args, filteredHostNames);

  const { group } = sortedHostsByMetric ?? {};
  return group?.hosts.buckets.map((p) => p.key as string) ?? [];
};

const getFilteredHostNames = async (args: GetHostsArgs) => {
  const filteredHosts = await getFilteredHosts(args);

  const { group } = filteredHosts ?? {};
  return group?.hosts.buckets.map((p) => p.key) ?? [];
};
