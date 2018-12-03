/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const hostsSchema = gql`
  type HostItem {
    _id: String
    name: String
    firstSeen: String
    version: String
    os: String
  }

  type HostsData {
    hosts: [HostItem]!
    total: Int
  }

  extend type Source {
    "Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    Hosts(timerange: TimerangeInput!, pagination: PaginationInput!, filterQuery: String): HostsData!
  }
`;
