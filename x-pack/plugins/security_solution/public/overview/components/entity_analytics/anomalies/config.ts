/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NOTABLE_ANOMALIES_IDS = [
  'auth_rare_source_ip_for_a_user',
  'packetbeat_dns_tunneling',
  'packetbeat_rare_server_domain',
  'packetbeat_rare_dns_question',
  'suspicious_login_activity',
  'v3_windows_anomalous_script',
  'high_count_network_denies',
  'v3_windows_anomalous_process_all_hosts',
  'v3_linux_rare_metadata_process',
  'packetbeat_rare_user_agent',
  'v3_linux_anomalous_process_all_hosts',
  'packetbeat_rare_urls',
  'v3_windows_anomalous_path_activity',
  'v3_windows_anomalous_process_creation',
  'v3_linux_system_process_discovery',
  'v3_linux_system_user_discovery',
  'high_count_by_destination_country',
  'auth_high_count_logon_events',
  'v3_linux_anomalous_user_name',
  'v3_rare_process_by_host_windows',
  'v3_linux_anomalous_network_activity',
  'auth_high_count_logon_fails',
  'auth_high_count_logon_events_for_a_source_ip',
  'v3_linux_rare_metadata_user',
  'rare_destination_country',
  'v3_linux_system_information_discovery',
  'v3_linux_rare_user_compiler',
  'v3_windows_anomalous_user_name',
  'v3_rare_process_by_host_linux',
  'v3_windows_anomalous_network_activity',
  'auth_rare_hour_for_a_user',
  'v3_windows_rare_metadata_user',
  'v3_windows_rare_user_type10_remote_login',
  'v3_linux_anomalous_network_port_activity',
  'v3_linux_rare_sudo_user',
  'v3_windows_anomalous_service',
  'v3_windows_rare_metadata_process',
  'v3_windows_rare_user_runas_event',
  'v3_linux_network_connection_discovery',
  'v3_linux_network_configuration_discovery',
  'auth_rare_user',
  'high_count_network_events',
] as const;

export type NotableAnomaliesJobId = typeof NOTABLE_ANOMALIES_IDS[number];
