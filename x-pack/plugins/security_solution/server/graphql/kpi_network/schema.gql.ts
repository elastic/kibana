/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiNetworkSchema = gql`
  type KpiNetworkHistogramData {
    x: Float
    y: Float
  }

  type KpiNetworkData {
    networkEvents: Float
    uniqueFlowId: Float
    uniqueSourcePrivateIps: Float
    uniqueSourcePrivateIpsHistogram: [KpiNetworkHistogramData!]
    uniqueDestinationPrivateIps: Float
    uniqueDestinationPrivateIpsHistogram: [KpiNetworkHistogramData!]
    dnsQueries: Float
    tlsHandshakes: Float
    inspect: Inspect
  }

  extend type Source {
    KpiNetwork(
      id: String
      timerange: TimerangeInput!
      filterQuery: String
      defaultIndex: [String!]!
    ): KpiNetworkData
  }
`;
