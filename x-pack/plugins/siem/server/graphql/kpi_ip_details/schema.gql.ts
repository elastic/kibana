/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiIpDetailsSchema = gql`
  type KpiIpDetailsHistogramData {
    x: String
    y: Float
  }

  type KpiIpDetailsData {
    connections: Float
    hosts: Float
    sourcePackets: Float
    sourcePacketsHistogram: [KpiIpDetailsHistogramData!]
    sourceByte: Float
    sourceByteHistogram: [KpiIpDetailsHistogramData!]
    destinationPackets: Float
    destinationPacketsHistogram: [KpiIpDetailsHistogramData!]
    destinationByte: Float
    destinationByteHistogram: [KpiIpDetailsHistogramData!]
  }

  extend type Source {
    KpiIpDetails(
      id: String
      timerange: TimerangeInput!
      filterQuery: String
      defaultIndex: [String!]!
      ip: String!
    ): KpiIpDetailsData
  }
`;
