/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

const ipOverviewSchema = gql`
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
    client: Overview
    destination: Overview
    server: Overview
    source: Overview
  }

  extend type Source {
    IpOverview(id: String, filterQuery: String, ip: String!): IpOverviewData
  }
`;

const domainsSchema = gql`
  enum DomainsFields {
    domainName
    direction
    bytes
    packets
    uniqueIpCount
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
      filterQuery: String
      id: String
      ip: String!
      pagination: PaginationInput!
      sort: DomainsSortField!
      flowDirection: FlowDirection!
      flowTarget: FlowTarget!
      timerange: TimerangeInput!
    ): DomainsData!
  }
`;

const lastFirstSeenSchema = gql`
  type LastFirstSeen {
    firstSeen: Date
    lastSeen: Date
  }

  extend type Source {
    DomainLastFirstSeen(
      id: String
      ip: String!
      domainName: String!
      flowTarget: FlowTarget!
    ): LastFirstSeen!
  }
`;

export const ipDetailsSchemas = [ipOverviewSchema, domainsSchema, lastFirstSeenSchema];
