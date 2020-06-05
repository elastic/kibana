/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewHostData } from '../../../graphql/types';

export const mockData: { OverviewHost: OverviewHostData } = {
  OverviewHost: {
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
  },
};
