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
    code: ToStringArray
    created: ToDateArray
    dataset: ToStringArray
    duration: ToNumberArray
    end: ToDateArray
    hash: ToStringArray
    id: ToStringArray
    kind: ToStringArray
    module: ToStringArray
    original: ToStringArray
    outcome: ToStringArray
    risk_score: ToNumberArray
    risk_score_norm: ToNumberArray
    severity: ToNumberArray
    start: ToDateArray
    timezone: ToStringArray
    type: ToStringArray
  }

  type Location {
    lon: ToNumberArray
    lat: ToNumberArray
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

  type AgentEcsField {
    type: ToStringArray
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
    id: ToStringArray
    ip: ToStringArray
    mac: ToStringArray
    name: ToStringArray
    os: OsEcsFields
    type: ToStringArray
  }

  type Thread {
    id: ToNumberArray
    start: ToStringArray
  }

  type ProcessHashData {
    md5: ToStringArray
    sha1: ToStringArray
    sha256: ToStringArray
  }

  type ProcessEcsFields {
    hash: ProcessHashData
    pid: ToNumberArray
    name: ToStringArray
    ppid: ToNumberArray
    args: ToStringArray
    entity_id: ToStringArray
    executable: ToStringArray
    title: ToStringArray
    thread: Thread
    working_directory: ToStringArray
  }

  type SourceEcsFields {
    bytes: ToNumberArray
    ip: ToStringArray
    port: ToNumberArray
    domain: ToStringArray
    geo: GeoEcsFields
    packets: ToNumberArray
  }

  type DestinationEcsFields {
    bytes: ToNumberArray
    ip: ToStringArray
    port: ToNumberArray
    domain: ToStringArray
    geo: GeoEcsFields
    packets: ToNumberArray
  }

  type DnsQuestionData {
    name: ToStringArray
    type: ToStringArray
  }

  type DnsEcsFields {
    question: DnsQuestionData
    resolved_ip: ToStringArray
    response_code: ToStringArray
  }

  type EndgameEcsFields {
    exit_code: ToNumberArray
    file_name: ToStringArray
    file_path: ToStringArray
    logon_type: ToNumberArray
    parent_process_name: ToStringArray
    pid: ToNumberArray
    process_name: ToStringArray
    subject_domain_name: ToStringArray
    subject_logon_id: ToStringArray
    subject_user_name: ToStringArray
    target_domain_name: ToStringArray
    target_logon_id: ToStringArray
    target_user_name: ToStringArray
  }

  type SuricataAlertData {
    signature: ToStringArray
    signature_id: ToNumberArray
  }

  type SuricataEveData {
    alert: SuricataAlertData
    flow_id: ToNumberArray
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
    local_resp: ToBooleanArray
    local_orig: ToBooleanArray
    missed_bytes: ToNumberArray
    state: ToStringArray
    history: ToStringArray
  }

  type ZeekNoticeData {
    suppress_for: ToNumberArray
    msg: ToStringArray
    note: ToStringArray
    sub: ToStringArray
    dst: ToStringArray
    dropped: ToBooleanArray
    peer_descr: ToStringArray
  }

  type ZeekDnsData {
    AA: ToBooleanArray
    qclass_name: ToStringArray
    RD: ToBooleanArray
    qtype_name: ToStringArray
    rejected: ToBooleanArray
    qtype: ToStringArray
    query: ToStringArray
    trans_id: ToNumberArray
    qclass: ToStringArray
    RA: ToBooleanArray
    TC: ToBooleanArray
  }

  type FileFields {
    name: ToStringArray
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
    size: ToNumberArray
    mtime: ToDateArray
    ctime: ToDateArray
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
    bytes: ToNumberArray
  }

  type HttpRequestData {
    method: ToStringArray
    body: HttpBodyData
    referrer: ToStringArray
    bytes: ToNumberArray
  }

  type HttpResponseData {
    status_code: ToNumberArray
    body: HttpBodyData
    bytes: ToNumberArray
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
    timedout: ToBooleanArray
    local_orig: ToBooleanArray
    tx_host: ToStringArray
    source: ToStringArray
    is_orig: ToBooleanArray
    overflow_bytes: ToNumberArray
    sha1: ToStringArray
    duration: ToNumberArray
    depth: ToNumberArray
    analyzers: ToStringArray
    mime_type: ToStringArray
    rx_host: ToStringArray
    total_bytes: ToNumberArray
    fuid: ToStringArray
    seen_bytes: ToNumberArray
    missing_bytes: ToNumberArray
    md5: ToStringArray
  }

  type ZeekSslData {
    cipher: ToStringArray
    established: ToBooleanArray
    resumed: ToBooleanArray
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
    domain: ToStringArray
    id: ToStringArray
    name: ToStringArray
    full_name: ToStringArray
    email: ToStringArray
    hash: ToStringArray
    group: ToStringArray
  }

  type WinlogEcsFields {
    event_id: ToNumberArray
  }

  type NetworkEcsField {
    bytes: ToNumberArray
    community_id: ToStringArray
    direction: ToStringArray
    packets: ToNumberArray
    protocol: ToStringArray
    transport: ToStringArray
  }

  type PackageEcsFields {
    arch: ToStringArray
    entity_id: ToStringArray
    name: ToStringArray
    size: ToNumberArray
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

  type RuleField {
    id: ToStringArray
    rule_id: ToStringArray
    false_positives: [String!]!
    saved_id: ToStringArray
    timeline_id: ToStringArray
    timeline_title: ToStringArray
    max_signals: ToNumberArray
    risk_score: ToStringArray
    output_index: ToStringArray
    description: ToStringArray
    from: ToStringArray
    immutable: ToBooleanArray
    index: ToStringArray
    interval: ToStringArray
    language: ToStringArray
    query: ToStringArray
    references: ToStringArray
    severity: ToStringArray
    tags: ToStringArray
    threat: ToAny
    type: ToStringArray
    size: ToStringArray
    to: ToStringArray
    enabled: ToBooleanArray
    filters: ToAny
    created_at: ToStringArray
    updated_at: ToStringArray
    created_by: ToStringArray
    updated_by: ToStringArray
    version: ToStringArray
    note: ToStringArray
    threshold: ToAny
    exceptions_list: ToAny
  }

  type SignalField {
    rule: RuleField
    original_time: ToStringArray
  }

  type RuleEcsField {
    reference: ToStringArray
  }

  type ECS {
    _id: String!
    _index: String
    agent: AgentEcsField
    auditd: AuditdEcsFields
    destination: DestinationEcsFields
    dns: DnsEcsFields
    endgame: EndgameEcsFields
    event: EventEcsFields
    geo: GeoEcsFields
    host: HostEcsFields
    network: NetworkEcsField
    rule: RuleEcsField
    signal: SignalField
    source: SourceEcsFields
    suricata: SuricataEcsFields
    tls: TlsEcsFields
    zeek: ZeekEcsFields
    http: HttpEcsFields
    url: UrlEcsFields
    timestamp: Date
    message: ToStringArray
    user: UserEcsFields
    winlog: WinlogEcsFields
    process: ProcessEcsFields
    file: FileFields
    system: SystemEcsField
  }

  type EcsEdges {
    node: ECS!
    cursor: CursorType!
  }
`;
