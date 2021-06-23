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
export const affectedJobIds: string[] = [
  // security_linux module
  'v2_rare_process_by_host_linux_ecs',
  'v2_linux_rare_metadata_user',
  'v2_linux_rare_metadata_process',
  'v2_linux_anomalous_user_name_ecs',
  'v2_linux_anomalous_process_all_hosts_ecs',
  'v2_linux_anomalous_network_port_activity_ecs',
  // security_windows module
  'v2_rare_process_by_host_windows_ecs',
  'v2_windows_anomalous_network_activity_ecs',
  'v2_windows_anomalous_path_activity_ecs',
  'v2_windows_anomalous_process_all_hosts_ecs',
  'v2_windows_anomalous_process_creation',
  'v2_windows_anomalous_user_name_ecs',
  'v2_windows_rare_metadata_process',
  'v2_windows_rare_metadata_user',
  // siem_auditbeat module
  'rare_process_by_host_linux_ecs',
  'linux_anomalous_network_activity_ecs',
  'linux_anomalous_network_port_activity_ecs',
  'linux_anomalous_network_service',
  'linux_anomalous_network_url_activity_ecs',
  'linux_anomalous_process_all_hosts_ecs',
  'linux_anomalous_user_name_ecs',
  'linux_rare_metadata_process',
  'linux_rare_metadata_user',
  'linux_rare_user_compiler',
  'linux_rare_kernel_module_arguments',
  'linux_rare_sudo_user',
  'linux_system_user_discovery',
  'linux_system_information_discovery',
  'linux_system_process_discovery',
  'linux_network_connection_discovery',
  'linux_network_configuration_discovery',
  // siem_winlogbeat module
  'rare_process_by_host_windows_ecs',
  'windows_anomalous_network_activity_ecs',
  'windows_anomalous_path_activity_ecs',
  'windows_anomalous_process_all_hosts_ecs',
  'windows_anomalous_process_creation',
  'windows_anomalous_script',
  'windows_anomalous_service',
  'windows_anomalous_user_name_ecs',
  'windows_rare_user_runas_event',
  'windows_rare_metadata_process',
  'windows_rare_metadata_user',
];
