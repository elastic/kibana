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
  type DomainsData {
    domain_name: String
  }

  extend type Source {
    Domains(id: String, filterQuery: String, ip: String!): DomainsData
  }
`;

export const ipDetailsSchemas = [ipOverviewSchema, domainsSchema];
