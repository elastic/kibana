/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const ecsSchema = gql`
  scalar ToStringArray

  type EventEcsFields {
    action: String
    category: String
    created: Date
    dataset: String
    duration: Float
    end: Date
    hash: String
    id: String
    kind: String
    module: String
    original: [String]
    outcome: ToStringArray
    risk_score: Float
    risk_score_norm: Float
    severity: Float
    start: Date
    timezone: String
    type: String
  }

  type Location {
    lon: Float
    lat: Float
  }

  type GeoEcsFields {
    city_name: String
    continent_name: String
    country_iso_code: String
    country_name: String
    location: Location
    region_iso_code: String
    region_name: String
  }

  type PrimarySecondary {
    primary: ToStringArray
    secondary: ToStringArray
    type: ToStringArray
  }

  type Summary {
    actor: PrimarySecondary
    object: PrimarySecondary
    how: ToStringArray
    message_type: ToStringArray
    sequence: ToStringArray
  }

  type AuditdData {
    acct: ToStringArray
    terminal: ToStringArray
    op: ToStringArray
  }

  type AuditdEcsFields {
    result: ToStringArray
    session: ToStringArray
    data: AuditdData
    summary: Summary
    sequence: ToStringArray
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
    id: ToStringArray
    start: ToStringArray
  }

  type ProcessEcsFields {
    pid: ToStringArray
    name: ToStringArray
    ppid: ToStringArray
    args: ToStringArray
    executable: ToStringArray
    title: ToStringArray
    thread: ToStringArray
    working_directory: ToStringArray
  }

  type SourceEcsFields {
    bytes: Float
    ip: String
    port: Float
    domain: [String!]
    geo: GeoEcsFields
    packets: Float
  }

  type DestinationEcsFields {
    bytes: Float
    ip: String
    port: Float
    domain: [String!]
    geo: GeoEcsFields
    packets: Float
  }

  type SuricataAlertData {
    signature: ToStringArray
    signature_id: ToStringArray
  }

  type SuricataEveData {
    alert: SuricataAlertData
    flow_id: ToStringArray
    proto: ToStringArray
  }

  type SuricataEcsFields {
    eve: SuricataEveData
  }

  type TlsJa3Data {
    hash: String
  }

  type FingerprintData {
    sha1: String
  }

  type TlsClientCertificateData {
    fingerprint: FingerprintData
  }

  type TlsServerCertificateData {
    fingerprint: FingerprintData
  }

  type TlsFingerprintsData {
    ja3: TlsJa3Data
  }

  type TlsEcsFields {
    client_certificate: TlsClientCertificateData
    fingerprints: TlsFingerprintsData
    server_certificate: TlsServerCertificateData
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

  type FileFields {
    path: String
    target_path: String
    extension: String
    type: String
    device: String
    inode: String
    uid: String
    owner: String
    gid: String
    group: String
    mode: String
    size: Float
    mtime: Date
    ctime: Date
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

  type NetworkEcsField {
    bytes: Float
    community_id: String
    direction: String
    packets: Float
    protocol: String
    transport: String
  }

  type PackageEcsFields {
    arch: ToStringArray
    entity_id: ToStringArray
    name: ToStringArray
    size: ToStringArray
    summary: ToStringArray
    version: ToStringArray
  }

  type AuditEcsFields {
    package: PackageEcsFields
  }

  type SshEcsFields {
    method: ToStringArray
    signature: ToStringArray
  }

  type AuthEcsFields {
    ssh: SshEcsFields
  }

  type SystemEcsField {
    audit: AuditEcsFields
    auth: AuthEcsFields
  }

  type ECS {
    _id: String!
    _index: String
    auditd: AuditdEcsFields
    destination: DestinationEcsFields
    event: EventEcsFields
    geo: GeoEcsFields
    host: HostEcsFields
    network: NetworkEcsField
    source: SourceEcsFields
    suricata: SuricataEcsFields
    tls: TlsEcsFields
    zeek: ZeekEcsFields
    http: HttpEcsFields
    url: UrlEcsFields
    timestamp: Date
    message: ToStringArray
    user: UserEcsFields
    process: ProcessEcsFields
    file: FileFields
    system: SystemEcsField
  }

  type EcsEdges {
    node: ECS!
    cursor: CursorType!
  }
`;
