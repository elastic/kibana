/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FactoryQueryTypes,
  NetworkKpiQueries,
} from '../../../../../../common/search_strategy/security_solution';

import { SecuritySolutionFactory } from '../../types';
import { networkKpiDns, networkKpiDnsSummary } from './dns';
import { networkKpiNetworkEvents, networkKpiNetworkEventsSummary } from './network_events';
import { networkKpiTlsHandshakes, networkKpiTlsHandshakesSummary } from './tls_handshakes';
import { networkKpiUniqueFlows } from './unique_flows';
import {
  networkKpiUniquePrivateIps,
  networkKpiUniquePrivateIpsSummary,
} from './unique_private_ips';

export const networkKpiFactory: Record<
  NetworkKpiQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [NetworkKpiQueries.dns]: networkKpiDns,
  [NetworkKpiQueries.dnsSummary]: networkKpiDnsSummary,
  [NetworkKpiQueries.networkEvents]: networkKpiNetworkEvents,
  [NetworkKpiQueries.networkEventsSummary]: networkKpiNetworkEventsSummary,
  [NetworkKpiQueries.tlsHandshakes]: networkKpiTlsHandshakes,
  [NetworkKpiQueries.tlsHandshakesSummary]: networkKpiTlsHandshakesSummary,
  [NetworkKpiQueries.uniqueFlows]: networkKpiUniqueFlows,
  [NetworkKpiQueries.uniquePrivateIps]: networkKpiUniquePrivateIps,
  [NetworkKpiQueries.uniquePrivateIpsSummary]: networkKpiUniquePrivateIpsSummary,
};
