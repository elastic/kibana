/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsSchema = gql`
  type KpiItem {
    value: String!
    count: Int!
  }

  type EventEcsFields {
    category: String
    id: Int
    module: String
    severity: Int
    type: String
  }

  type GeoEcsFields {
    country_iso_code: String
    region_name: String
  }

  type OsEcsFields {
    platform: String
    name: String
    full: String
    family: String
    version: String
    kernel: String
  }

  type HostEcsFields {
    id: String
    ip: String
    name: String
    os: OsEcsFields
  }

  type Thread {
    id: Int
    start: String
  }

  type ProcessEcsFields {
    pid: Int
    name: String
    ppid: Int
    args: [String]
    executable: String
    title: String
    thread: Thread
    working_directory: String
  }

  type SourceEcsFields {
    ip: String
    port: Int
  }

  type DestinationEcsFields {
    ip: String
    port: Int
  }

  type SuricataAlertData {
    signature: String
    signature_id: Int
  }

  type SuricataEveData {
    alert: SuricataAlertData
    flow_id: Int
    proto: String
  }

  type SuricataEcsFields {
    eve: SuricataEveData
  }

  type UserEcsFields {
    id: Int
    name: String
    full_name: String
    email: String
    hash: String
    group: String
  }

  type ECS {
    _id: String
    _index: String
    destination: DestinationEcsFields
    event: EventEcsFields
    geo: GeoEcsFields
    host: HostEcsFields
    source: SourceEcsFields
    suricata: SuricataEcsFields
    timestamp: String
    user: UserEcsFields
  }

  type EcsEdges {
    event: ECS!
    cursor: CursorType!
  }

  type EventsData {
    kpiEventType: [KpiItem!]
    edges: [EcsEdges!]!
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
