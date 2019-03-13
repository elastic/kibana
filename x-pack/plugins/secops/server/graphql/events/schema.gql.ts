/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsSchema = gql`
  scalar DetailItemValue

  type KpiItem {
    value: String!
    count: Float!
  }

  type EventsData {
    kpiEventType: [KpiItem!]
    edges: [EcsEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
  }

  type DetailItem {
    category: String!
    description: String
    example: String
    field: String!
    type: String!
    value: DetailItemValue!
  }

  type EventDetailsData {
    data: [DetailItem!]
  }

  extend type Source {
    "Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    Events(
      pagination: PaginationInput!
      sortField: SortField!
      timerange: TimerangeInput
      filterQuery: String
    ): EventsData!
    EventDetails(eventId: String!, indexName: String!): EventDetailsData!
  }
`;
