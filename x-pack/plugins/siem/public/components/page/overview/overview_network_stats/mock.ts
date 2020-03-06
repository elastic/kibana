/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewNetworkData } from '../../../../graphql/types';

export const mockData: { OverviewNetwork: OverviewNetworkData } = {
  OverviewNetwork: {
    auditbeatSocket: 12,
    filebeatCisco: 999,
    filebeatNetflow: 7777,
    filebeatPanw: 66,
    filebeatSuricata: 60015,
    filebeatZeek: 2003,
    packetbeatDNS: 10277307,
    packetbeatFlow: 16,
    packetbeatTLS: 3400000,
  },
};
