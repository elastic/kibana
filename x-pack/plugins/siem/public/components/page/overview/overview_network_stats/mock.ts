/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewNetworkData } from '../../../../graphql/types';

export const mockData: { OverviewNetwork: OverviewNetworkData } = {
  OverviewNetwork: {
    packetbeatFlow: 16,
    packetbeatDNS: 10277307,
    filebeatSuricata: 60015,
    filebeatZeek: 2003,
    auditbeatSocket: 12,
  },
};
