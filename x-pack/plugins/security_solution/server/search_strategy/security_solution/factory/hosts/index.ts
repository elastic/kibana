/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FactoryQueryTypes,
  HostsQueries,
  HostsKpiQueries,
} from '../../../../../common/search_strategy/security_solution';

import { SecuritySolutionFactory } from '../types';
import { allHosts, allHostsEntities } from './all';
import { hostDetails } from './details';
import { hostOverview } from './overview';
import { firstOrLastSeenHost } from './last_first_seen';
import { uncommonProcesses } from './uncommon_processes';
import { hostsKpiAuthentications, hostsKpiAuthenticationsEntities } from './kpi/authentications';
import { hostsKpiHosts, hostsKpiHostsEntities } from './kpi/hosts';
import { hostsKpiUniqueIps, hostsKpiUniqueIpsEntities } from './kpi/unique_ips';

export const hostsFactory: Record<
  HostsQueries | HostsKpiQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [HostsQueries.details]: hostDetails,
  [HostsQueries.hosts]: allHosts,
  [HostsQueries.hostsEntities]: allHostsEntities,
  [HostsQueries.overview]: hostOverview,
  [HostsQueries.firstOrLastSeen]: firstOrLastSeenHost,
  [HostsQueries.uncommonProcesses]: uncommonProcesses,
  [HostsKpiQueries.kpiAuthentications]: hostsKpiAuthentications,
  [HostsKpiQueries.kpiAuthenticationsEntities]: hostsKpiAuthenticationsEntities,
  [HostsKpiQueries.kpiHosts]: hostsKpiHosts,
  [HostsKpiQueries.kpiHostsEntities]: hostsKpiHostsEntities,
  [HostsKpiQueries.kpiUniqueIps]: hostsKpiUniqueIps,
  [HostsKpiQueries.kpiUniqueIpsEntities]: hostsKpiUniqueIpsEntities,
};
