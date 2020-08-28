/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ZeekEcs {
  session_id?: string[];

  connection?: ZeekConnectionData;

  notice?: ZeekNoticeData;

  dns?: ZeekDnsData;

  http?: ZeekHttpData;

  files?: ZeekFileData;

  ssl?: ZeekSslData;
}

export interface ZeekConnectionData {
  local_resp?: boolean[];

  local_orig?: boolean[];

  missed_bytes?: number[];

  state?: string[];

  history?: string[];
}

export interface ZeekNoticeData {
  suppress_for?: number[];

  msg?: string[];

  note?: string[];

  sub?: string[];

  dst?: string[];

  dropped?: boolean[];

  peer_descr?: string[];
}

export interface ZeekDnsData {
  AA?: boolean[];

  qclass_name?: string[];

  RD?: boolean[];

  qtype_name?: string[];

  rejected?: boolean[];

  qtype?: string[];

  query?: string[];

  trans_id?: number[];

  qclass?: string[];

  RA?: boolean[];

  TC?: boolean[];
}

export interface ZeekHttpData {
  resp_mime_types?: string[];

  trans_depth?: string[];

  status_msg?: string[];

  resp_fuids?: string[];

  tags?: string[];
}

export interface ZeekFileData {
  session_ids?: string[];

  timedout?: boolean[];

  local_orig?: boolean[];

  tx_host?: string[];

  source?: string[];

  is_orig?: boolean[];

  overflow_bytes?: number[];

  sha1?: string[];

  duration?: number[];

  depth?: number[];

  analyzers?: string[];

  mime_type?: string[];

  rx_host?: string[];

  total_bytes?: number[];

  fuid?: string[];

  seen_bytes?: number[];

  missing_bytes?: number[];

  md5?: string[];
}

export interface ZeekSslData {
  cipher?: string[];

  established?: boolean[];

  resumed?: boolean[];

  version?: string[];
}
