/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import { GetHostsRequestParams, GetHostsResponsePayload } from '../../../../common/http_api/hosts';
import { getHostMetrics } from './get_hosts_metrics';
import { getFilteredHosts } from './get_filtered_hosts';
import { mapToApiResponse } from './map_to_response';
import { hasFilters } from './utils';

import { GetHostsArgs } from './types';

const combine = (
  result: {
    unsortedResponse: IKibanaSearchResponse<GetHostsResponsePayload>;
    sortedResponse?: IKibanaSearchResponse<GetHostsResponsePayload>;
  },
  params: GetHostsRequestParams
): GetHostsResponsePayload['hosts'] => {
  const {
    unsortedResponse: { rawResponse: unsortedHosts },
    sortedResponse: { rawResponse: sortedHosts } = {},
  } = result;

  const dedupResponse = !!sortedHosts
    ? unsortedHosts.hosts
        .filter((o) => !sortedHosts?.hosts.some((s) => s.name === o.name))
        .slice(0, params.limit - sortedHosts?.hosts.length ?? 0)
    : unsortedHosts.hosts;

  return !params.sortDirection || params.sortDirection === 'asc'
    ? [...dedupResponse, ...(sortedHosts?.hosts ?? [])]
    : [...(sortedHosts?.hosts ?? []), ...dedupResponse];
};

export const getHostsList = async ({
  searchClient: serchClient,
  source,
  params,
  options,
  id,
}: GetHostsArgs): Promise<IKibanaSearchResponse<GetHostsResponsePayload>> => {
  const runFilterQuery = hasFilters(params.query);

  const filteredHosts = runFilterQuery
    ? await lastValueFrom(
        getFilteredHosts({ searchClient: serchClient, source, params, options, id })
      )
    : null;

  const { sampling } = filteredHosts?.rawResponse ?? {};
  const hostsFound = (sampling?.doc_count ?? 0) > 0;
  if (runFilterQuery && !hostsFound) {
    return {
      ...filteredHosts,
      rawResponse: { hosts: [] },
    };
  }

  const filteredHostNames = sampling?.hosts.buckets.map((p) => p.key);
  const [unsortedResponse, sortedResponse] = await getHostMetrics({
    searchClient: serchClient,
    source,
    params,
    options,
    id,
    filteredHostNames,
  }).then((responses) =>
    responses.filter(Boolean).map((res) => ({
      ...res,
      rawResponse: mapToApiResponse(params, res?.rawResponse),
    }))
  );

  return {
    ...unsortedResponse,
    rawResponse: { hosts: combine({ unsortedResponse, sortedResponse }, params) },
  };
};
