/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const authorizationsSchema = gql`
  type AuthorizationItem {
    _id: String!
    failures: Int!
    successes: Int!
    latest: String!
    source: SourceEcsFields!
    host: HostEcsFields!
    user: UserEcsFields!
  }

  type AuthorizationsEdges {
    node: AuthorizationItem!
    cursor: CursorType!
  }

  type AuthorizationsData {
    edges: [AuthorizationsEdges!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets Authorization success and failures based on a timerange"
    Authorizations(
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): AuthorizationsData!
  }
`;
