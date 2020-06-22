/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const overviewSchema = gql`
  type OverviewNetworkData {
    auditbeatSocket: Float
    filebeatCisco: Float
    filebeatNetflow: Float
    filebeatPanw: Float
    filebeatSuricata: Float
    filebeatZeek: Float
    packetbeatDNS: Float
    packetbeatFlow: Float
    packetbeatTLS: Float
    inspect: Inspect
  }

  type OverviewHostData {
    auditbeatAuditd: Float
    auditbeatFIM: Float
    auditbeatLogin: Float
    auditbeatPackage: Float
    auditbeatProcess: Float
    auditbeatUser: Float
    endgameDns: Float
    endgameFile: Float
    endgameImageLoad: Float
    endgameNetwork: Float
    endgameProcess: Float
    endgameRegistry: Float
    endgameSecurity: Float
    filebeatSystemModule: Float
    winlogbeatSecurity: Float
    winlogbeatMWSysmonOperational: Float
    inspect: Inspect
  }

  extend type Source {
    OverviewNetwork(
      id: String
      timerange: TimerangeInput!
      filterQuery: String
      defaultIndex: [String!]!
    ): OverviewNetworkData
    OverviewHost(
      id: String
      timerange: TimerangeInput!
      filterQuery: String
      defaultIndex: [String!]!
    ): OverviewHostData
  }
`;
