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

import { networkKpiDns, networkKpiDnsEntities } from './kpi/dns';
import { networkKpiNetworkEvents, networkKpiNetworkEventsEntities } from './kpi/network_events';
import { networkKpiTlsHandshakes, networkKpiTlsHandshakesEntities } from './kpi/tls_handshakes';
import { networkKpiUniqueFlows } from './kpi/unique_flows';
import {
  networkKpiUniquePrivateIps,
  networkKpiUniquePrivateIpsEntities,
} from './kpi/unique_private_ips';
import { SecuritySolutionFactory } from '../types';
import { networkDetails } from './details';
import { networkDns } from './dns';
import { networkHttp } from './http';
import { networkOverview } from './overview';
import { networkTls } from './tls';
import { networkTopCountries, networkTopCountriesEntities } from './top_countries';
import { networkTopNFlow, networkTopNFlowEntities } from './top_n_flow';
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
  [NetworkQueries.topCountriesEntities]: networkTopCountriesEntities,
  [NetworkQueries.topNFlow]: networkTopNFlow,
  [NetworkQueries.topNFlowEntities]: networkTopNFlowEntities,
  [NetworkQueries.users]: networkUsers,
  [NetworkKpiQueries.dns]: networkKpiDns,
  [NetworkKpiQueries.dnsEntities]: networkKpiDnsEntities,
  [NetworkKpiQueries.networkEvents]: networkKpiNetworkEvents,
  [NetworkKpiQueries.networkEventsEntities]: networkKpiNetworkEventsEntities,
  [NetworkKpiQueries.tlsHandshakes]: networkKpiTlsHandshakes,
  [NetworkKpiQueries.tlsHandshakesEntities]: networkKpiTlsHandshakesEntities,
  [NetworkKpiQueries.uniqueFlows]: networkKpiUniqueFlows,
  [NetworkKpiQueries.uniquePrivateIps]: networkKpiUniquePrivateIps,
  [NetworkKpiQueries.uniquePrivateIpsEntities]: networkKpiUniquePrivateIpsEntities,
};
