/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetHostsResponsePayload } from '../../../../common/http_api/hosts';
import { getFilteredHosts } from './get_filtered_hosts';
import { mapToApiResponse } from './mapper';
import { hasFilters } from './utils';
import { getTopHosts } from './get_top_hosts';
import { GetHostsArgs } from './types';

export const getHosts = async (args: GetHostsArgs): Promise<GetHostsResponsePayload> => {
  const runFilterQuery = hasFilters(args.params.query);
  const hostNamesShortList = runFilterQuery ? await getFilteredHostNames(args) : [];
  if (runFilterQuery && hostNamesShortList.length === 0) {
    return {
      hosts: [],
    };
  }

  const topHosts = await getTopHosts(args, hostNamesShortList);
  return mapToApiResponse(args.params, topHosts?.hosts.buckets);
};

const getFilteredHostNames = async (args: GetHostsArgs) => {
  const filteredHosts = await getFilteredHosts(args);

  const { hosts } = filteredHosts ?? {};
  return hosts?.buckets.map((p) => p.key) ?? [];
};
