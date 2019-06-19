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
    uniqueSourcePrivateIps: 383,
    uniqueSourcePrivateIpsHistogram: [
      {
        x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
        y: 8,
      },
      {
        x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
        y: 0,
      },
    ],
    uniqueDestinationPrivateIps: 18,
    uniqueDestinationPrivateIpsHistogram: [
      {
        x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
        y: 8,
      },
      {
        x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
        y: 0,
      },
    ],
    dnsQueries: 278,
    tlsHandshakes: 10000,
  },
};
