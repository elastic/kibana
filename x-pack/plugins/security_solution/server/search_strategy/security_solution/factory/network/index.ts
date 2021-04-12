/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FactoryQueryTypes,
  NetworkQueries,
  NetworkKpiQueries,
} from '../../../../../common/search_strategy/security_solution';

import { networkKpiDns } from './kpi/dns';
import { networkKpiNetworkEvents } from './kpi/network_events';
import { networkKpiTlsHandshakes } from './kpi/tls_handshakes';
import { networkKpiUniqueFlows } from './kpi/unique_flows';
import { networkKpiUniquePrivateIps } from './kpi/unique_private_ips';
import { SecuritySolutionFactory } from '../types';
import { networkDetails } from './details';
import { networkDns } from './dns';
import { networkHttp } from './http';
import { networkOverview } from './overview';
import { networkTls } from './tls';
import { networkTopCountries } from './top_countries';
import { networkTopNFlow } from './top_n_flow';
import { networkUsers } from './users';

export const networkFactory: Record<
  NetworkQueries | NetworkKpiQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [NetworkQueries.details]: networkDetails,
  [NetworkQueries.dns]: networkDns,
  [NetworkQueries.http]: networkHttp,
  [NetworkQueries.overview]: networkOverview,
  [NetworkQueries.tls]: networkTls,
  [NetworkQueries.topCountries]: networkTopCountries,
  [NetworkQueries.topNFlow]: networkTopNFlow,
  [NetworkQueries.users]: networkUsers,
  [NetworkKpiQueries.dns]: networkKpiDns,
  [NetworkKpiQueries.networkEvents]: networkKpiNetworkEvents,
  [NetworkKpiQueries.tlsHandshakes]: networkKpiTlsHandshakes,
  [NetworkKpiQueries.uniqueFlows]: networkKpiUniqueFlows,
  [NetworkKpiQueries.uniquePrivateIps]: networkKpiUniquePrivateIps,
};
