/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uptimeOverviewLocatorID } from '../../../../observability/public';
import { OVERVIEW_ROUTE } from '../../../common/constants/ui';

const formatSearchKey = (key: string, value: string) => `${key}: "${value}"`;

async function navigate({
  ip,
  host,
  container,
  pod,
}: {
  ip?: string;
  host?: string;
  container?: string;
  pod?: string;
}) {
  const searchParams: string[] = [];

  if (host) searchParams.push(formatSearchKey('host.name', host));
  if (container) searchParams.push(formatSearchKey('container.id', container));
  if (pod) searchParams.push(formatSearchKey('kubernetes.pod.uid', pod));

  if (ip) {
    const root = host ? 'host' : 'monitor';
    searchParams.push(formatSearchKey(`${root}.ip`, ip));
  }

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
