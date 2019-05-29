/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewHostData } from '../../../../graphql/types';

export const mockData: { OverviewHost: OverviewHostData } = {
  OverviewHost: {
    auditbeatAuditd: 73847,
    auditbeatFIM: 107307,
    auditbeatLogin: 60015,
    auditbeatPackage: 2003,
    auditbeatProcess: 1200,
    auditbeatUser: 1979,
  },
};
