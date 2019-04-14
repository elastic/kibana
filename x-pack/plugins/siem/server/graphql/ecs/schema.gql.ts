/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const ecsSchema = gql`
  scalar ToStringArray

  type EventEcsFields {
    action: ToStringArray
    category: ToStringArray
    created: ToStringArray
    dataset: ToStringArray
    duration: ToStringArray
    end: ToStringArray
    hash: ToStringArray
    id: ToStringArray
    kind: ToStringArray
    module: ToStringArray
    original: ToStringArray
    outcome: ToStringArray
    risk_score: ToStringArray
    risk_score_norm: ToStringArray
    severity: ToStringArray
    start: ToStringArray
    timezone: ToStringArray
    type: ToStringArray
  }

  type Location {
    lon: ToStringArray
    lat: ToStringArray
  }

  type GeoEcsFields {
    city_name: ToStringArray
    continent_name: ToStringArray
    country_iso_code: ToStringArray
    country_name: ToStringArray
    location: Location
    region_iso_code: ToStringArray
    region_name: ToStringArray
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
    platform: ToStringArray
    name: ToStringArray
    full: ToStringArray
    family: ToStringArray
    version: ToStringArray
    kernel: ToStringArray
  }

  type HostEcsFields {
    architecture: ToStringArray
    id: String
    ip: ToStringArray
    mac: ToStringArray
    name: ToStringArray
    os: OsEcsFields
    type: ToStringArray
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
    bytes: ToStringArray
    ip: ToStringArray
    port: ToStringArray
    domain: ToStringArray
    geo: GeoEcsFields
    packets: ToStringArray
  }

  type DestinationEcsFields {
    bytes: ToStringArray
    ip: ToStringArray
    port: ToStringArray
    domain: ToStringArray
    geo: GeoEcsFields
    packets: ToStringArray
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
    hash: ToStringArray
  }

  type FingerprintData {
    sha1: ToStringArray
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
    local_resp: ToStringArray
    local_orig: ToStringArray
    missed_bytes: ToStringArray
    state: ToStringArray
    history: ToStringArray
  }

  type ZeekNoticeData {
    suppress_for: ToStringArray
    msg: ToStringArray
    note: ToStringArray
    sub: ToStringArray
    dst: ToStringArray
    dropped: ToStringArray
    peer_descr: ToStringArray
  }

  type ZeekDnsData {
    AA: ToStringArray
    qclass_name: ToStringArray
    RD: ToStringArray
    qtype_name: ToStringArray
    rejected: ToStringArray
    qtype: ToStringArray
    query: ToStringArray
    trans_id: ToStringArray
    qclass: ToStringArray
    RA: ToStringArray
    TC: ToStringArray
  }

  type FileFields {
    path: ToStringArray
    target_path: ToStringArray
    extension: ToStringArray
    type: ToStringArray
    device: ToStringArray
    inode: ToStringArray
    uid: ToStringArray
    owner: ToStringArray
    gid: ToStringArray
    group: ToStringArray
    mode: ToStringArray
    size: ToStringArray
    mtime: ToStringArray
    ctime: ToStringArray
  }

  type ZeekHttpData {
    resp_mime_types: ToStringArray
    trans_depth: ToStringArray
    status_msg: ToStringArray
    resp_fuids: ToStringArray
    tags: ToStringArray
  }

  type HttpBodyData {
    content: ToStringArray
    bytes: ToStringArray
  }

  type HttpRequestData {
    method: ToStringArray
    body: HttpBodyData
    referrer: ToStringArray
    bytes: ToStringArray
  }

  type HttpResponseData {
    status_code: ToStringArray
    body: HttpBodyData
    bytes: ToStringArray
  }

  type HttpEcsFields {
    version: ToStringArray
    request: HttpRequestData
    response: HttpResponseData
  }

  type UrlEcsFields {
    domain: ToStringArray
    original: ToStringArray
    username: ToStringArray
    password: ToStringArray
  }

  type ZeekFileData {
    session_ids: ToStringArray
    timedout: ToStringArray
    local_orig: ToStringArray
    tx_host: ToStringArray
    source: ToStringArray
    is_orig: ToStringArray
    overflow_bytes: ToStringArray
    sha1: ToStringArray
    duration: ToStringArray
    depth: ToStringArray
    analyzers: ToStringArray
    mime_type: ToStringArray
    rx_host: ToStringArray
    total_bytes: ToStringArray
    fuid: ToStringArray
    seen_bytes: ToStringArray
    missing_bytes: ToStringArray
    md5: ToStringArray
  }

  type ZeekSslData {
    cipher: ToStringArray
    established: ToStringArray
    resumed: ToStringArray
    version: ToStringArray
  }

  type ZeekEcsFields {
    session_id: ToStringArray
    connection: ZeekConnectionData
    notice: ZeekNoticeData
    dns: ZeekDnsData
    http: ZeekHttpData
    files: ZeekFileData
    ssl: ZeekSslData
  }

  type UserEcsFields {
    id: ToStringArray
    name: ToStringArray
    full_name: ToStringArray
    email: ToStringArray
    hash: ToStringArray
    group: ToStringArray
  }

  type NetworkEcsField {
    bytes: ToStringArray
    community_id: ToStringArray
    direction: ToStringArray
    packets: ToStringArray
    protocol: ToStringArray
    transport: ToStringArray
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
