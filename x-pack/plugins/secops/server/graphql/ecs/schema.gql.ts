/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const ecsSchema = gql`
  type EventEcsFields {
    category: String
    duration: Float
    id: Float
    module: String
    severity: Float
    action: String
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
    domain: [String]
  }

  type DestinationEcsFields {
    ip: String
    port: Float
    domain: [String]
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

  enum NetworkDirectionEcs {
    inbound
    outbound
    internal
    external
    unknown
  }

  type NetworkEcsField {
    bytes: Float
    packets: Float
    direction: [NetworkDirectionEcs!]
  }

  type ECS {
    _id: String!
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
`;
