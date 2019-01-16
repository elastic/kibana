/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const authenticationsSchema = gql`
  type AuthenticationItem {
    _id: String!
    failures: Int!
    successes: Int!
    latest: String!
    source: SourceEcsFields!
    host: HostEcsFields!
    user: UserEcsFields!
  }

  type AuthenticationsEdges {
    node: AuthenticationItem!
    cursor: CursorType!
  }

  type AuthenticationsData {
    edges: [AuthenticationsEdges!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets Authentication success and failures based on a timerange"
    Authentications(
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): AuthenticationsData!
  }
`;
