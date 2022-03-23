/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These are the job IDs of ML jobs that are dependent on specific ECS data. If
// any of them is installed, we want to notify the user that they potentially
// have incompatibility between their beats, rules, and jobs.
// There are four modules of jobs that are affected. However, because the API
// that returns installed jobs does not include those jobs' modules, hardcoding
// the IDs from those modules (as found in e.g.
// x-pack/plugins/ml/server/models/data_recognizer/modules/security_windows/manifest.json)
// allows us to make this determination from a single API call.
//
// Note: In 8.2 the V3 ML modules were released and a large portion of the V1/V2
// jobs were removed or Replaced. We're leveraging this same upgrade callout
// to inform users of this change and any actions that must be taken before
// updating their Detection Rules to ensure continued functionality if they
// still need to run the V1/V2 jobs
// For details see: https://github.com/elastic/kibana/issues/128121
export const affectedJobIds: string[] = [
  // security_linux module
  'v2_rare_process_by_host_linux_ecs', // Replaced by: v3_rare_process_by_host_linux_ecs
  'v2_linux_rare_metadata_user', // Replaced by: v3_linux_rare_metadata_user
  'v2_linux_rare_metadata_process', // Replaced by: v3_linux_rare_metadata_process
  'v2_linux_anomalous_user_name_ecs', // Replaced by: v3_linux_anomalous_user_name_ecs
  'v2_linux_anomalous_process_all_hosts_ecs', // Replaced by: v3_linux_anomalous_process_all_hosts_ecs
  'v2_linux_anomalous_network_port_activity_ecs', // Replaced by: v3_linux_anomalous_network_port_activity_ecs
  // security_windows module
  'v2_rare_process_by_host_windows_ecs', // Replaced by: v3_rare_process_by_host_windows_ecs
  'v2_windows_anomalous_network_activity_ecs', // Replaced by: v3_windows_anomalous_network_activity_ecs
  'v2_windows_anomalous_path_activity_ecs', // Replaced by: v3_windows_anomalous_path_activity_ecs
  'v2_windows_anomalous_process_all_hosts_ecs', // Replaced by: v3_windows_anomalous_process_all_hosts_ecs
  'v2_windows_anomalous_process_creation', // Replaced by: v3_windows_anomalous_process_creation
  'v2_windows_anomalous_user_name_ecs', // Replaced by: v3_windows_anomalous_user_name_ecs
  'v2_windows_rare_metadata_process', // Replaced by: v3_windows_rare_metadata_process
  'v2_windows_rare_metadata_user', // Replaced by: v3_windows_rare_metadata_user
  // siem_auditbeat module
  'rare_process_by_host_linux_ecs', // Replaced by: v3_rare_process_by_host_linux_ecs
  'linux_anomalous_network_activity_ecs', // Replaced by: v3_linux_anomalous_network_activity_ecs
  'linux_anomalous_network_port_activity_ecs', // Replaced by: v3_linux_anomalous_network_port_activity_ecs
  'linux_anomalous_network_service', // Deleted
  'linux_anomalous_network_url_activity_ecs', // Deleted
  'linux_anomalous_process_all_hosts_ecs', // Replaced by: v3_linux_anomalous_process_all_hosts_ecs
  'linux_anomalous_user_name_ecs', // Replaced by: v3_linux_anomalous_user_name_ecs
  'linux_rare_metadata_process', // Replaced by: v3_linux_rare_metadata_process
  'linux_rare_metadata_user', // Replaced by: v3_linux_rare_metadata_user
  'linux_rare_user_compiler', // Replaced by: v3_linux_rare_user_compiler
  'linux_rare_kernel_module_arguments', // Deleted
  'linux_rare_sudo_user', // Replaced by: v3_linux_rare_sudo_user
  'linux_system_user_discovery', // Replaced by: v3_linux_system_user_discovery
  'linux_system_information_discovery', // Replaced by: v3_linux_system_information_discovery
  'linux_system_process_discovery', // Replaced by: v3_linux_system_process_discovery
  'linux_network_connection_discovery', // Replaced by: v3_linux_network_connection_discovery
  'linux_network_configuration_discovery', // Replaced by: v3_linux_network_configuration_discovery
  // siem_winlogbeat module
  'rare_process_by_host_windows_ecs', // Replaced by: v3_rare_process_by_host_windows_ecs
  'windows_anomalous_network_activity_ecs', // Replaced by: v3_windows_anomalous_network_activity_ecs
  'windows_anomalous_path_activity_ecs', // Replaced by: v3_windows_anomalous_path_activity_ecs
  'windows_anomalous_process_all_hosts_ecs', // Replaced by: v3_windows_anomalous_process_all_hosts_ecs
  'windows_anomalous_process_creation', // Replaced by: v3_windows_anomalous_process_creation
  'windows_anomalous_script', // Replaced by: v3_windows_anomalous_script
  'windows_anomalous_service', // Replaced by: v3_windows_anomalous_service
  'windows_anomalous_user_name_ecs', // Replaced by: v3_windows_anomalous_user_name_ecs
  'windows_rare_user_runas_event', // Replaced by: v3_windows_rare_user_runas_event
  'windows_rare_metadata_process', // Replaced by: v3_windows_rare_metadata_process
  'windows_rare_metadata_user', // Replaced by: v3_windows_rare_metadata_user
  // siem_winlogbeat_auth module
  'windows_rare_user_type10_remote_login', // Replaced by: v3_windows_rare_user_type10_remote_login
];
