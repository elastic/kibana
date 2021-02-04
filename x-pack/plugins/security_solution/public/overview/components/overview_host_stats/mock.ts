/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsOverviewStrategyResponse } from '../../../../common/search_strategy';

export const mockData: HostsOverviewStrategyResponse['overviewHost'] = {
  auditbeatAuditd: 73847,
  auditbeatFIM: 107307,
  auditbeatLogin: 60015,
  auditbeatPackage: 2003,
  auditbeatProcess: 1200,
  auditbeatUser: 1979,
  endgameDns: 39123,
  endgameFile: 39456,
  endgameImageLoad: 39789,
  endgameNetwork: 39101112,
  endgameProcess: 39131415,
  endgameRegistry: 39161718,
  endgameSecurity: 39202122,
  filebeatSystemModule: 568,
  winlogbeatSecurity: 195929,
  winlogbeatMWSysmonOperational: 101070,
};
