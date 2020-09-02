/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import { HostsQueries } from '../../../../../common/search_strategy/security_solution/hosts';

import { SecuritySolutionFactory } from '../types';
import { allHosts } from './all';
import { hostDetails } from './details';
import { hostOverview } from './overview';
import { firstLastSeenHost } from './last_first_seen';
import { authentications } from './authentications';

export const hostsFactory: Record<HostsQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [HostsQueries.details]: hostDetails,
  [HostsQueries.hosts]: allHosts,
  [HostsQueries.overview]: hostOverview,
  [HostsQueries.firstLastSeen]: firstLastSeenHost,
  [HostsQueries.authentications]: authentications,
};
