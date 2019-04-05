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

  type AutonomousSystem {
    as_org: String
    asn: String
    ip: String
  }

  type Overview {
    firstSeen: Date
    lastSeen: Date
    autonomousSystem: AutonomousSystem!
    host: HostEcsFields!
    geo: GeoEcsFields!
  }

  type IpOverviewData {
    source: Overview
    destination: Overview
  }

  extend type Source {
    IpOverview(id: String, filterQuery: String, ip: String!): IpOverviewData
  }
`;

export const domainsSchema = gql`
  enum DomainsFields {
    dnsName
    queryCount
    uniqueDomains
    dnsBytesIn
    dnsBytesOut
  }

  input DomainsSortField {
    field: DomainsFields!
    direction: Direction!
  }

  type DomainsNetworkField {
    bytes: Float
    packets: Float
    transport: String
    direction: [NetworkDirectionEcs!]
  }

  type DomainsItem {
    uniqueIpCount: Float
    domainName: String
    firstSeen: Date
    lastSeen: Date
  }

  type DomainsNode {
    _id: String
    timestamp: Date
    source: DomainsItem
    destination: DomainsItem
    client: DomainsItem
    server: DomainsItem
    network: DomainsNetworkField
  }

  type DomainsEdges {
    node: DomainsNode!
    cursor: CursorType!
  }

  type DomainsData {
    edges: [DomainsEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  extend type Source {
    Domains(
      direction: FlowDirection!
      filterQuery: String
      id: String
      ip: String!
      pagination: PaginationInput!
      sort: DomainsSortField!
      type: FlowType!
      timerange: TimerangeInput!
    ): DomainsData!
  }
`;

export const ipDetailsSchemas = [ipOverviewSchema, domainsSchema];
