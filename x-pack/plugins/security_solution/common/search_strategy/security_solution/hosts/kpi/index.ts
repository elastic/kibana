/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './authentications';
export * from './common';
export * from './hosts';
export * from './unique_ips';

import { HostsKpiAuthenticationsStrategyResponse } from './authentications';
import { HostsKpiHostsStrategyResponse } from './hosts';
import { HostsKpiUniqueIpsStrategyResponse } from './unique_ips';

export enum HostsKpiQueries {
  kpiAuthentications = 'hostsKpiAuthentications',
  kpiHosts = 'hostsKpiHosts',
  kpiUniqueIps = 'hostsKpiUniqueIps',
}

export type HostsKpiStrategyResponse =
  | Omit<HostsKpiAuthenticationsStrategyResponse, 'rawResponse'>
  | Omit<HostsKpiHostsStrategyResponse, 'rawResponse'>
  | Omit<HostsKpiUniqueIpsStrategyResponse, 'rawResponse'>;
