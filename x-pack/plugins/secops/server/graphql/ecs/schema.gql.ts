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
    dataset: String
  }

  type GeoEcsFields {
    country_iso_code: String
    region_name: String
  }

  type PrimarySecondary {
    primary: String
    secondary: String
    type: String
  }

  type Summary {
    actor: PrimarySecondary
    object: PrimarySecondary
    how: String
    message_type: String
    sequence: Float
  }

  type AuditdData {
    acct: String
    terminal: String
    op: String
  }

  type AuditdEcsFields {
    result: String
    session: String
    data: AuditdData
    summary: Summary
    sequence: Float
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
    domain: [String!]
  }

  type DestinationEcsFields {
    ip: String
    port: Float
    domain: [String!]
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

  type ZeekConnectionData {
    local_resp: String
    local_orig: String
    missed_bytes: Float
    state: String
    history: String
  }

  type ZeekNoticeData {
    suppress_for: Float
    msg: String
    note: String
    sub: String
    dst: String
    dropped: Boolean
    peer_descr: String
  }

  type ZeekDnsData {
    AA: Boolean
    qclass_name: String
    RD: Boolean
    qtype_name: String
    rejected: Boolean
    qtype: Float
    query: String
    trans_id: Float
    qclass: Float
    RA: Boolean
    TC: Boolean
  }

  type ZeekHttpData {
    resp_mime_types: [String!]
    trans_depth: String
    status_msg: String
    resp_fuids: [String!]
    tags: [String!]
  }

  type HttpBodyData {
    content: String
    bytes: Float
  }

  type HttpRequestData {
    method: String
    body: HttpBodyData
    referrer: String
    bytes: Float
  }

  type HttpResponseData {
    status_code: Float
    body: HttpBodyData
    bytes: Float
  }

  type HttpEcsFields {
    version: String
    request: HttpRequestData
    response: HttpResponseData
  }

  type UrlEcsFields {
    domain: String
    original: String
    username: String
    password: String
  }

  type ZeekFileData {
    session_ids: [String!]
    timedout: Boolean
    local_orig: Boolean
    tx_host: String
    source: String
    is_orig: Boolean
    overflow_bytes: Float
    sha1: String
    duration: Float
    depth: Float
    analyzers: [String!]
    mime_type: String
    rx_host: String
    total_bytes: Float
    fuid: String
    seen_bytes: Float
    missing_bytes: Float
    md5: String
  }

  type ZeekSslData {
    cipher: String
    established: Boolean
    resumed: Boolean
    version: String
  }

  type ZeekEcsFields {
    session_id: String
    connection: ZeekConnectionData
    notice: ZeekNoticeData
    dns: ZeekDnsData
    http: ZeekHttpData
    files: ZeekFileData
    ssl: ZeekSslData
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
    transport: String
    direction: [NetworkDirectionEcs!]
  }

  type ECS {
    _id: String!
    _index: String
    auditd: AuditdEcsFields
    destination: DestinationEcsFields
    event: EventEcsFields
    message: String
    geo: GeoEcsFields
    host: HostEcsFields
    network: NetworkEcsField
    source: SourceEcsFields
    suricata: SuricataEcsFields
    zeek: ZeekEcsFields
    http: HttpEcsFields
    url: UrlEcsFields
    timestamp: Date
    user: UserEcsFields
    process: ProcessEcsFields
  }

  type EcsEdges {
    node: ECS!
    cursor: CursorType!
  }
`;
