/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const uncommonProcessesSchema = gql`
  type UncommonProcessItem {
    _id: String!
    name: String!
    title: String
    instances: Int!
    hosts: [HostEcsFields!]!
  }

  type UncommonProcessesEdges {
    uncommonProcess: UncommonProcessItem!
    cursor: CursorType!
  }

  type UncommonProcessesData {
    edges: [UncommonProcessesEdges!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets UncommonProcesses based on a timerange, or all UncommonProcesses if no criteria is specified"
    UncommonProcesses(
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): UncommonProcessesData!
  }
`;
