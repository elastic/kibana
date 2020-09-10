/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkSchema = gql`
  enum NetworkDirectionEcs {
    inbound
    outbound
    internal
    external
    incoming
    outgoing
    listening
    unknown
  }

  type TopNetworkTablesEcsField {
    bytes_in: Float
    bytes_out: Float
  }

  type GeoItem {
    geo: GeoEcsFields
    flowTarget: FlowTargetSourceDest
  }

  type AutonomousSystemItem {
    name: String
    number: Float
  }

  type TopCountriesItemSource {
    country: String
    destination_ips: Float
    flows: Float
    location: GeoItem
    source_ips: Float
  }

  type TopCountriesItemDestination {
    country: String
    destination_ips: Float
    flows: Float
    location: GeoItem
    source_ips: Float
  }

  type NetworkTopCountriesItem {
    _id: String
    source: TopCountriesItemSource
    destination: TopCountriesItemDestination
    network: TopNetworkTablesEcsField
  }

  type NetworkTopCountriesEdges {
    node: NetworkTopCountriesItem!
    cursor: CursorType!
  }

  type NetworkTopCountriesData {
    edges: [NetworkTopCountriesEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
  }

  type TopNFlowItemSource {
    autonomous_system: AutonomousSystemItem
    domain: [String!]
    ip: String
    location: GeoItem
    flows: Float
    destination_ips: Float
  }

  type TopNFlowItemDestination {
    autonomous_system: AutonomousSystemItem
    domain: [String!]
    ip: String
    location: GeoItem
    flows: Float
    source_ips: Float
  }

  enum NetworkTopTablesFields {
    bytes_in
    bytes_out
    flows
    destination_ips
    source_ips
  }

  input NetworkTopTablesSortField {
    field: NetworkTopTablesFields!
    direction: Direction!
  }

  type NetworkTopNFlowItem {
    _id: String
    source: TopNFlowItemSource
    destination: TopNFlowItemDestination
    network: TopNetworkTablesEcsField
  }

  type NetworkTopNFlowEdges {
    node: NetworkTopNFlowItem!
    cursor: CursorType!
  }

  type NetworkTopNFlowData {
    edges: [NetworkTopNFlowEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
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
    uniqueDomains: Float
  }

  type NetworkDnsEdges {
    node: NetworkDnsItem!
    cursor: CursorType!
  }

  type MatrixOverOrdinalHistogramData {
    x: String!
    y: Float!
    g: String!
  }

  type NetworkDnsData {
    edges: [NetworkDnsEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
    histogram: [MatrixOverOrdinalHistogramData!]
  }

  enum NetworkHttpFields {
    domains
    lastHost
    lastSourceIp
    methods
    path
    requestCount
    statuses
  }

  input NetworkHttpSortField {
    direction: Direction!
  }

  type NetworkHttpItem {
    _id: String
    domains: [String!]!
    lastHost: String
    lastSourceIp: String
    methods: [String!]!
    path: String
    requestCount: Float
    statuses: [String!]!
  }

  type NetworkHttpEdges {
    node: NetworkHttpItem!
    cursor: CursorType!
  }

  type NetworkHttpData {
    edges: [NetworkHttpEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
  }

  type NetworkDsOverTimeData {
    inspect: Inspect
    matrixHistogramData: [MatrixOverTimeHistogramData!]!
    totalCount: Float!
  }

  extend type Source {
    NetworkTopCountries(
      id: String
      filterQuery: String
      ip: String
      flowTarget: FlowTargetSourceDest!
      pagination: PaginationInputPaginated!
      sort: NetworkTopTablesSortField!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): NetworkTopCountriesData!
    NetworkTopNFlow(
      id: String
      filterQuery: String
      ip: String
      flowTarget: FlowTargetSourceDest!
      pagination: PaginationInputPaginated!
      sort: NetworkTopTablesSortField!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): NetworkTopNFlowData!
    NetworkDns(
      filterQuery: String
      id: String
      isPtrIncluded: Boolean!
      pagination: PaginationInputPaginated!
      sort: NetworkDnsSortField!
      stackByField: String
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): NetworkDnsData!
    NetworkDnsHistogram(
      filterQuery: String
      defaultIndex: [String!]!
      timerange: TimerangeInput!
      stackByField: String
      docValueFields: [docValueFieldsInput!]!
    ): NetworkDsOverTimeData!
    NetworkHttp(
      id: String
      filterQuery: String
      ip: String
      pagination: PaginationInputPaginated!
      sort: NetworkHttpSortField!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): NetworkHttpData!
  }
`;
