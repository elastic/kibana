/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsSchema = gql`
  scalar EsValue

  type EventsTimelineData {
    edges: [EcsEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
    inspect: Inspect
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
    inspect: Inspect
  }

  type DetailItem {
    field: String!
    values: ToStringArray
    originalValue: EsValue
  }

  input LastTimeDetails {
    hostName: String
    ip: String
  }

  type TimelineDetailsData {
    data: [DetailItem!]
    inspect: Inspect
  }

  type LastEventTimeData {
    lastSeen: Date
    inspect: Inspect
  }

  enum LastEventIndexKey {
    hostDetails
    hosts
    ipDetails
    network
  }

  extend type Source {
    Timeline(
      pagination: PaginationInput!
      sortField: SortField!
      fieldRequested: [String!]!
      timerange: TimerangeInput
      filterQuery: String
      defaultIndex: [String!]!
      docValueFields: [docValueFieldsInput!]!
    ): TimelineData!
    TimelineDetails(
      eventId: String!
      indexName: String!
      defaultIndex: [String!]!
      docValueFields: [docValueFieldsInput!]!
    ): TimelineDetailsData!
    LastEventTime(
      id: String
      indexKey: LastEventIndexKey!
      details: LastTimeDetails!
      defaultIndex: [String!]!
      docValueFields: [docValueFieldsInput!]!
    ): LastEventTimeData!
  }
`;
