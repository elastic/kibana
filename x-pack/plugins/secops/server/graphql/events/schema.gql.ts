/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsSchema = gql`
  type KpiItem {
    value: String!
    count: Float!
  }

  type EventEcsFields {
    category: String
    id: Float
    module: String
    severity: Float
    type: String
  }

  type GeoEcsFields {
    country_iso_code: String
    region_name: String
  }

  type HostEcsFields {
    id: String
    ip: String
    name: String
  }

  type SourceEcsFields {
    ip: String
    port: Float
  }

  type DestinationEcsFields {
    ip: String
    port: Float
  }

  type SuricataAlertData {
    signature: String
    signature_id: Float
  }

  type SuricataEveData {
    alert: SuricataAlertData
    flow_id: Float
    proto: String
  }

  type SuricataEcsFields {
    eve: SuricataEveData
  }

  type EventItem {
    _id: String
    _index: String
    destination: DestinationEcsFields
    event: EventEcsFields
    geo: GeoEcsFields
    host: HostEcsFields
    source: SourceEcsFields
    suricata: SuricataEcsFields
    timestamp: String
  }

  type EventEdges {
    event: EventItem!
    cursor: CursorType!
  }

  type EventsData {
    kpiEventType: [KpiItem!]
    edges: [EventEdges!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  extend type Source {
    "Gets events based on timerange and specified criteria, or all events in the timerange if no criteria is specified"
    Events(
      pagination: PaginationInput!
      sortField: SortField!
      timerange: TimerangeInput
      filterQuery: String
    ): EventsData!
  }
`;
