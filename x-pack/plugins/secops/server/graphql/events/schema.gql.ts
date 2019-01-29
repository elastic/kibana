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

  type OsEcsFields {
    platform: String
    name: String
    full: String
    family: String
    version: String
    kernel: String
  }

  type HostEcsFields {
    architecture: String
    id: String
    ip: [String]
    mac: [String]
    name: String
    os: OsEcsFields
    type: String
  }

  type Thread {
    id: Float
    start: String
  }

  type ProcessEcsFields {
    pid: Float
    name: String
    ppid: Float
    args: [String]
    executable: String
    title: String
    thread: Thread
    working_directory: String
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

  type UserEcsFields {
    id: Float
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
    node: ECS!
    cursor: CursorType!
  }

  type EventsData {
    kpiEventType: [KpiItem!]
    edges: [EcsEdges!]!
    totalCount: Float!
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
