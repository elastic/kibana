/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const hostsSchema = gql`
  type HostItem {
    _id: String
    firstSeen: Date
    host: HostEcsFields
    lastBeat: Date
  }

  type HostsEdges {
    node: HostItem!
    cursor: CursorType!
  }

  type HostsData {
    edges: [HostsEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    Hosts(
      id: String
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): HostsData!
  }
`;
