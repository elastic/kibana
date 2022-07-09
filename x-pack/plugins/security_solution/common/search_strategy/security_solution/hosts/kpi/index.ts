/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from '../../users/kpi/authentications';
export * from './common';
export * from './hosts';
export * from './unique_ips';

import type { UsersKpiAuthenticationsStrategyResponse } from '../../users/kpi/authentications';
import type { HostsKpiHostsStrategyResponse } from './hosts';
import type { HostsKpiUniqueIpsStrategyResponse } from './unique_ips';

export enum HostsKpiQueries {
  kpiHosts = 'hostsKpiHosts',
  kpiUniqueIps = 'hostsKpiUniqueIps',
}

export type HostsKpiStrategyResponse =
  | Omit<UsersKpiAuthenticationsStrategyResponse, 'rawResponse'>
  | Omit<HostsKpiHostsStrategyResponse, 'rawResponse'>
  | Omit<HostsKpiUniqueIpsStrategyResponse, 'rawResponse'>;
