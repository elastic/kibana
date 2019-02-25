/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkTopNFlowSchema = gql`
  type TopNFlowItem {
    count: Float
    domain: [String!]
    ip: String
  }

  type NetworkTopNFlowItem {
    _id: String
    timestamp: String
    source: TopNFlowItem
    destination: TopNFlowItem
    client: TopNFlowItem
    server: TopNFlowItem
    network: NetworkEcsField
  }

  type NetworkTopNFlowEdges {
    node: NetworkTopNFlowItem!
    cursor: CursorType!
  }

  type NetworkTopNFlowData {
    edges: [NetworkTopNFlowEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  enum NetworkTopNFlowType {
    client
    destination
    server
    source
  }

  enum NetworkTopNFlowDirection {
    uniDirectional
    biDirectional
  }

  extend type Source {
    "Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    NetworkTopNFlow(
      id: String
      direction: NetworkTopNFlowDirection!
      type: NetworkTopNFlowType!
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): NetworkTopNFlowData!
  }
`;
