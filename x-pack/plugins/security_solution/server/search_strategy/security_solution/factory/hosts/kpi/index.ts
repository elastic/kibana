/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FactoryQueryTypes,
  HostsKpiQueries,
} from '../../../../../../common/search_strategy/security_solution';

import { SecuritySolutionFactory } from '../../types';
import { hostsKpiAuthentications } from './authentications';
import { hostsKpiHosts } from './hosts';
import { hostsKpiUniqueIps } from './unique_ips';

export const hostsKpiFactory: Record<
  HostsKpiQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [HostsKpiQueries.authentications]: hostsKpiAuthentications,
  [HostsKpiQueries.hosts]: hostsKpiHosts,
  [HostsKpiQueries.uniqueIps]: hostsKpiUniqueIps,
};
