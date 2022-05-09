/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './dns';
export * from './network_events';
export * from './tls_handshakes';
export * from './unique_flows';
export * from './unique_private_ips';

import { NetworkKpiDnsStrategyResponse } from './dns';
import { NetworkKpiNetworkEventsStrategyResponse } from './network_events';
import { NetworkKpiTlsHandshakesStrategyResponse } from './tls_handshakes';
import { NetworkKpiUniqueFlowsStrategyResponse } from './unique_flows';
import { NetworkKpiUniquePrivateIpsStrategyResponse } from './unique_private_ips';

export enum NetworkKpiQueries {
  dns = 'networkKpiDns',
  networkEvents = 'networkKpiNetworkEvents',
  tlsHandshakes = 'networkKpiTlsHandshakes',
  uniqueFlows = 'networkKpiUniqueFlows',
  uniquePrivateIps = 'networkKpiUniquePrivateIps',
}

export type NetworkKpiStrategyResponse =
  | Omit<NetworkKpiDnsStrategyResponse, 'rawResponse'>
  | Omit<NetworkKpiNetworkEventsStrategyResponse, 'rawResponse'>
  | Omit<NetworkKpiTlsHandshakesStrategyResponse, 'rawResponse'>
  | Omit<NetworkKpiUniqueFlowsStrategyResponse, 'rawResponse'>
  | Omit<NetworkKpiUniquePrivateIpsStrategyResponse, 'rawResponse'>;
