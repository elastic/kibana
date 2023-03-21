/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NOTABLE_ANOMALIES_IDS: NotableAnomaliesJobId[] = [
  'auth_rare_source_ip_for_a_user',
  'packetbeat_dns_tunneling',
  'packetbeat_rare_server_domain',
  'packetbeat_rare_dns_question',
  'suspicious_login_activity',
  'v3_windows_anomalous_script',
];
export type NotableAnomaliesJobId =
  | 'auth_rare_source_ip_for_a_user'
  | 'packetbeat_dns_tunneling'
  | 'packetbeat_rare_server_domain'
  | 'packetbeat_rare_dns_question'
  | 'suspicious_login_activity'
  | 'v3_windows_anomalous_script';
