/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsSchema = gql`
  type KpiHostHistogramData {
    x: String
    y: Float
  }

  type KpiHostsData {
    hosts: Float
    hostsHistogram: [KpiHostHistogramData!]
    authSuccess: Float
    authSuccessHistogram: [KpiHostHistogramData!]
    authFailure: Float
    authFailureHistogram: [KpiHostHistogramData!]
    uniqueSourceIps: Float
    uniqueSourceIpsHistogram: [KpiHostHistogramData!]
    uniqueDestinationIps: Float
    uniqueDestinationIpsHistogram: [KpiHostHistogramData!]
  }

  extend type Source {
    KpiHosts(
      id: String
      timerange: TimerangeInput!
      filterQuery: String
      defaultIndex: [String!]!
    ): KpiHostsData!
  }
`;
