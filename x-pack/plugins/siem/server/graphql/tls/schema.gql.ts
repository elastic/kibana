/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const tlsSchema = gql`
  enum TlsFields {
    _id
  }
  type TlsNode {
    _id: String
    timestamp: Date
    notAfter: [String!]
    subjects: [String!]
    ja3: [String!]
    issuers: [String!]
  }
  input TlsSortField {
    field: TlsFields!
    direction: Direction!
  }
  type TlsEdges {
    node: TlsNode!
    cursor: CursorType!
  }
  type TlsData {
    edges: [TlsEdges!]!
    totalCount: Float!
    pageInfo: PageInfoPaginated!
    inspect: Inspect
  }
  extend type Source {
    Tls(
      filterQuery: String
      id: String
      ip: String!
      pagination: PaginationInputPaginated!
      sort: TlsSortField!
      flowTarget: FlowTargetSourceDest!
      timerange: TimerangeInput!
      defaultIndex: [String!]!
    ): TlsData!
  }
`;
