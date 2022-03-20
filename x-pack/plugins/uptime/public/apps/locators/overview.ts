/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uptimeOverviewLocatorID } from '../../../../observability/public';
import { OVERVIEW_ROUTE } from '../../../common/constants';

const formatSearchKey = (key: string, value: string) => `${key}: "${value}"`;

async function navigate({ ip, hostname }: { ip?: string; hostname?: string }) {
  const searchParams: string[] = [];

  if (ip) searchParams.push(formatSearchKey('monitor.ip', ip));
  if (hostname) searchParams.push(formatSearchKey('url.domain', hostname));

  const searchString = searchParams.join(' OR ');

  const path =
    searchParams.length === 0 ? OVERVIEW_ROUTE : OVERVIEW_ROUTE + `?search=${searchString}`;

  return {
    app: 'uptime',
    path,
    state: {},
  };
}

export const uptimeOverviewNavigatorParams = {
  id: uptimeOverviewLocatorID,
  getLocation: navigate,
};
