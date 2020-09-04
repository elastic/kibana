/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FactoryQueryTypes,
  HostsQueries,
} from '../../../../../common/search_strategy/security_solution';

import { SecuritySolutionFactory } from '../types';
import { allHosts } from './all';
import { overviewHost } from './overview';
import { firstLastSeenHost } from './last_first_seen';
import { uncommonProcesses } from './uncommon_processes';
import { authentications } from './authentications';

export const hostsFactory: Record<HostsQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [HostsQueries.hosts]: allHosts,
  [HostsQueries.hostOverview]: overviewHost,
  [HostsQueries.firstLastSeen]: firstLastSeenHost,
  [HostsQueries.uncommonProcesses]: uncommonProcesses,
  [HostsQueries.authentications]: authentications,
};
