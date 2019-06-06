/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const hostsSchema = gql`
  type OsFields {
    platform: String
    name: String
    full: String
    family: String
    version: String
    kernel: String
  }

  type HostFields {
    architecture: String
    id: String
    ip: [String]
    mac: [String]
    name: String
    os: OsFields
    type: String
  }

  type CloudInstance {
    id: [String]
  }

  type CloudMachine {
    type: [String]
  }

  type CloudFields {
    instance: CloudInstance
    machine: CloudMachine
    provider: [String]
    region: [String]
  }

  type HostItem {
    _id: String
    lastSeen: Date
    host: HostEcsFields
    cloud: CloudFields
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

  type FirstLastSeenHost {
    firstSeen: Date
    lastSeen: Date
  }

  enum HostsFields {
    hostName
    lastSeen
  }

  input HostsSortField {
    field: HostsFields!
    direction: Direction!
  }

  extend type Source {
    "Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    Hosts(
      id: String
      timerange: TimerangeInput!
      pagination: PaginationInput!
      sort: HostsSortField!
      filterQuery: String
      defaultIndex: [String!]!
    ): HostsData!
    HostOverview(
      id: String
      hostName: String!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): HostItem!
    HostFirstLastSeen(id: String, hostName: String!, defaultIndex: [String!]!): FirstLastSeenHost!
  }
`;
