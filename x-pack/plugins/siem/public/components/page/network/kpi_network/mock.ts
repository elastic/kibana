/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiNetworkData } from '../../../../graphql/types';

export const mockData: { KpiNetwork: KpiNetworkData } = {
  KpiNetwork: {
    networkEvents: 16,
    uniqueFlowId: 10277307,
    activeAgents: 60015,
    uniqueSourcePrivateIps: 383,
    uniqueDestinationPrivateIps: 18,
    dnsQueries: 278,
    tlsHandshakes: 10000,
  },
};
