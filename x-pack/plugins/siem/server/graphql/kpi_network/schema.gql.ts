/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiNetworkSchema = gql`
  type KpiNetworkCount {
    value: Float
    doc_count: Float
  }

  type KpiNetworkHistogramData {
    key_as_string: String
    count: KpiNetworkCount
    doc_count: Float
  }

  type KpiNetworkData {
    networkEvents: Float
    networkEventsHistogram: [KpiNetworkHistogramData!]
    uniqueFlowId: Float
    activeAgents: Float
    uniqueSourcePrivateIps: Float
    uniqueSourcePrivateIpsHistogram: [KpiNetworkHistogramData!]
    uniqueDestinationPrivateIps: Float
    uniqueDestinationPrivateIpsHistogram: [KpiNetworkHistogramData!]
    dnsQueries: Float
    tlsHandshakes: Float
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
