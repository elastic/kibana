/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const authorizationSchema = gql`
  type AuthorizationItem {
    _id: String!
    name: String!
    title: String
    instances: Int!
    hosts: [HostEcsFields!]!
  }

  type AuthorizationsEdges {
    authorization: AuthorizationItem!
    cursor: CursorType!
  }

  type AuthorizationsData {
    edges: [AuthorizationsEdges!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets Authorization success and failures based on a timerange"
    Authorization(
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): AuthorizationsData!
  }
`;
