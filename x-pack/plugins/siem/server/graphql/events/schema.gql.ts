/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsSchema = gql`
  scalar EsValue

  type KpiItem {
    value: String
    count: Float!
  }

  type EventsData {
    kpiEventType: [KpiItem!]
    edges: [EcsEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  type TimelineNonEcsData {
    field: String!
    value: ToStringArray
  }

  type TimelineItem {
    _id: String!
    _index: String
    data: [TimelineNonEcsData!]!
    ecs: ECS!
  }

  type TimelineEdges {
    node: TimelineItem!
    cursor: CursorType!
  }

  type TimelineData {
    edges: [TimelineEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  type DetailItem {
    category: String!
    description: String
    example: String
    field: String!
    type: String!
    values: ToStringArray
    originalValue: EsValue
  }

  input LastTimeDetails {
    hostName: String
    ip: String
  }

  type TimelineDetailsData {
    data: [DetailItem!]
  }

  type LastEventTimeData {
    lastSeen: Date
  }

  enum LastEventIndexKey {
    hostDetails
    hosts
    ipDetails
    network
  }

  extend type Source {
    "Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    Events(
      pagination: PaginationInput!
      sortField: SortField!
      timerange: TimerangeInput
      filterQuery: String
    ): EventsData!
    Timeline(
      pagination: PaginationInput!
      sortField: SortField!
      fieldRequested: [String!]!
      timerange: TimerangeInput
      filterQuery: String
    ): TimelineData!
    TimelineDetails(eventId: String!, indexName: String!): TimelineDetailsData!
    LastEventTime(
      id: String
      indexKey: LastEventIndexKey!
      details: LastTimeDetails!
    ): LastEventTimeData!
  }
`;
