/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiNetworkSchema = gql`
  type KpiNetworkData {
    networkEvents: Float
    uniqueFlowId: Float
    activeAgents: Float
    uniqueSourcePrivateIps: Float
    uniqueDestinationPrivateIps: Float
    dnsQueries: Float
    tlsHandshakes: Float
  }

  extend type Source {
    KpiNetwork(id: String, timerange: TimerangeInput!, filterQuery: String): KpiNetworkData
  }
`;
