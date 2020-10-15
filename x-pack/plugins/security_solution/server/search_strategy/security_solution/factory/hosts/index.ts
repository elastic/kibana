/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FactoryQueryTypes,
  HostsQueries,
  HostsKpiQueries,
} from '../../../../../common/search_strategy/security_solution';

import { SecuritySolutionFactory } from '../types';
import { allHosts } from './all';
import { hostDetails } from './details';
import { hostOverview } from './overview';
import { firstLastSeenHost } from './last_first_seen';
import { uncommonProcesses } from './uncommon_processes';
import { authentications } from './authentications';
import { hostsKpiAuthentications } from './kpi/authentications';
import { hostsKpiHosts } from './kpi/hosts';
import { hostsKpiUniqueIps } from './kpi/unique_ips';

export const hostsFactory: Record<
  HostsQueries | HostsKpiQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [HostsQueries.details]: hostDetails,
  [HostsQueries.hosts]: allHosts,
  [HostsQueries.overview]: hostOverview,
  [HostsQueries.firstLastSeen]: firstLastSeenHost,
  [HostsQueries.uncommonProcesses]: uncommonProcesses,
  [HostsQueries.authentications]: authentications,
  [HostsKpiQueries.kpiAuthentications]: hostsKpiAuthentications,
  [HostsKpiQueries.kpiHosts]: hostsKpiHosts,
  [HostsKpiQueries.kpiUniqueIps]: hostsKpiUniqueIps,
};
