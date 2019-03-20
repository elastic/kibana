/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkSchema = gql`
  type TopNFlowItem {
    count: Float
    domain: [String!]
    ip: String
  }

  enum NetworkTopNFlowFields {
    bytes
    packets
    ipCount
  }

  input NetworkTopNFlowSortField {
    field: NetworkTopNFlowFields!
    direction: Direction!
  }

  type NetworkTopNFlowItem {
    _id: String
    timestamp: Date
    source: TopNFlowItem
    destination: TopNFlowItem
    client: TopNFlowItem
    server: TopNFlowItem
    network: NetworkEcsField
  }

  type NetworkTopNFlowEdges {
    node: NetworkTopNFlowItem!
    cursor: CursorType!
  }

  type NetworkTopNFlowData {
    edges: [NetworkTopNFlowEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  enum NetworkTopNFlowType {
    client
    destination
    server
    source
  }

  enum NetworkTopNFlowDirection {
    uniDirectional
    biDirectional
  }

  enum NetworkDnsFields {
    dnsName
    queryCount
    uniqueDomains
    dnsBytesIn
    dnsBytesOut
  }

  input NetworkDnsSortField {
    field: NetworkDnsFields!
    direction: Direction!
  }

  type NetworkDnsItem {
    _id: String
    dnsBytesIn: Float
    dnsBytesOut: Float
    dnsName: String
    queryCount: Float
    timestamp: Date
    uniqueDomains: Float
  }

  type NetworkDnsEdges {
    node: NetworkDnsItem!
    cursor: CursorType!
  }

  type NetworkDnsData {
    edges: [NetworkDnsEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    NetworkTopNFlow(
      direction: NetworkTopNFlowDirection!
      filterQuery: String
      id: String
      pagination: PaginationInput!
      sort: NetworkTopNFlowSortField!
      type: NetworkTopNFlowType!
      timerange: TimerangeInput!
    ): NetworkTopNFlowData!
    NetworkDns(
      filterQuery: String
      id: String
      isPtrIncluded: Boolean!
      pagination: PaginationInput!
      sort: NetworkDnsSortField!
      timerange: TimerangeInput!
    ): NetworkDnsData!
  }
`;
