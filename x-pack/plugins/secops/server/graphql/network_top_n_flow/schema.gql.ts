/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkTopNFlowSchema = gql`
  type NetworkTopNFlowSource {
    ip: String
    domain: String
  }

  type NetworkTopNFlowDestination {
    ip: String
    domain: String
  }

  type NetworkTopNFlowEvent {
    duration: Float
  }

  type NetworkTopNFlowNetwork {
    bytes: Float
    packets: Float
  }

  type NetworkTopNFlowItem {
    _id: String
    source: NetworkTopNFlowSource
    destination: NetworkTopNFlowDestination
    event: NetworkTopNFlowEvent
    network: NetworkTopNFlowNetwork
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
    source
    destination
  }

  extend type Source {
    "Gets Hosts based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    NetworkTopNFlow(
      id: String
      type: NetworkTopNFlowType!
      timerange: TimerangeInput!
      pagination: PaginationInput!
      filterQuery: String
    ): NetworkTopNFlowData!
  }
`;
