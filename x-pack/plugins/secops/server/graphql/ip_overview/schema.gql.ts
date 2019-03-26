/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const ipOverviewSchema = gql`
  enum IpOverviewType {
    destination
    source
  }

  type Overview {
    firstSeen: Date
    lastSeen: Date
    domains: [String!]
    host: HostEcsFields
    geo: GeoEcsFields
  }

  type IpOverviewData {
    source: Overview
    destination: Overview
  }

  extend type Source {
    IpOverview(
      id: String
      timerange: TimerangeInput!
      filterQuery: String
      ip: String!
    ): IpOverviewData
  }
`;
