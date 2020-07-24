/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from either:
// - scripts/regen_prepackage_rules_index.sh
// - detection-rules repo using CLI command build-release
// Do not hand edit. Run script/command to regenerate package information instead

import rule1 from './apm_403_response_to_a_post.json';
import rule2 from './apm_405_response_method_not_allowed.json';
import rule3 from './apm_null_user_agent.json';
import rule4 from './apm_sqlmap_user_agent.json';
import rule5 from './command_and_control_dns_directly_to_the_internet.json';
import rule6 from './command_and_control_ftp_file_transfer_protocol_activity_to_the_internet.json';
import rule7 from './command_and_control_irc_internet_relay_chat_protocol_activity_to_the_internet.json';
import rule8 from './command_and_control_nat_traversal_port_activity.json';
import rule9 from './command_and_control_port_26_activity.json';
import rule10 from './command_and_control_port_8000_activity_to_the_internet.json';
import rule11 from './command_and_control_pptp_point_to_point_tunneling_protocol_activity.json';
import rule12 from './command_and_control_proxy_port_activity_to_the_internet.json';
import rule13 from './command_and_control_rdp_remote_desktop_protocol_from_the_internet.json';
import rule14 from './command_and_control_smtp_to_the_internet.json';
import rule15 from './command_and_control_sql_server_port_activity_to_the_internet.json';
import rule16 from './command_and_control_ssh_secure_shell_from_the_internet.json';
import rule17 from './command_and_control_ssh_secure_shell_to_the_internet.json';
import rule18 from './command_and_control_telnet_port_activity.json';
import rule19 from './command_and_control_tor_activity_to_the_internet.json';
import rule20 from './command_and_control_vnc_virtual_network_computing_from_the_internet.json';
import rule21 from './command_and_control_vnc_virtual_network_computing_to_the_internet.json';
import rule22 from './credential_access_tcpdump_activity.json';
import rule23 from './defense_evasion_adding_the_hidden_file_attribute_with_via_attribexe.json';
import rule24 from './defense_evasion_clearing_windows_event_logs.json';
import rule25 from './defense_evasion_delete_volume_usn_journal_with_fsutil.json';
import rule26 from './defense_evasion_deleting_backup_catalogs_with_wbadmin.json';
import rule27 from './defense_evasion_disable_windows_firewall_rules_with_netsh.json';
import rule28 from './defense_evasion_encoding_or_decoding_files_via_certutil.json';
import rule29 from './defense_evasion_execution_via_trusted_developer_utilities.json';
import rule30 from './defense_evasion_misc_lolbin_connecting_to_the_internet.json';
import rule31 from './defense_evasion_via_filter_manager.json';
import rule32 from './defense_evasion_volume_shadow_copy_deletion_via_vssadmin.json';
import rule33 from './defense_evasion_volume_shadow_copy_deletion_via_wmic.json';
import rule34 from './discovery_process_discovery_via_tasklist_command.json';
import rule35 from './discovery_whoami_command_activity.json';
import rule36 from './discovery_whoami_commmand.json';
import rule37 from './endpoint_adversary_behavior_detected.json';
import rule38 from './endpoint_cred_dumping_detected.json';
import rule39 from './endpoint_cred_dumping_prevented.json';
import rule40 from './endpoint_cred_manipulation_detected.json';
import rule41 from './endpoint_cred_manipulation_prevented.json';
import rule42 from './endpoint_exploit_detected.json';
import rule43 from './endpoint_exploit_prevented.json';
import rule44 from './endpoint_malware_detected.json';
import rule45 from './endpoint_malware_prevented.json';
import rule46 from './endpoint_permission_theft_detected.json';
import rule47 from './endpoint_permission_theft_prevented.json';
import rule48 from './endpoint_process_injection_detected.json';
import rule49 from './endpoint_process_injection_prevented.json';
import rule50 from './endpoint_ransomware_detected.json';
import rule51 from './endpoint_ransomware_prevented.json';
import rule52 from './execution_command_prompt_connecting_to_the_internet.json';
import rule53 from './execution_command_shell_started_by_powershell.json';
import rule54 from './execution_command_shell_started_by_svchost.json';
import rule55 from './execution_html_help_executable_program_connecting_to_the_internet.json';
import rule56 from './execution_local_service_commands.json';
import rule57 from './execution_msbuild_making_network_connections.json';
import rule58 from './execution_mshta_making_network_connections.json';
import rule59 from './execution_psexec_lateral_movement_command.json';
import rule60 from './execution_register_server_program_connecting_to_the_internet.json';
import rule61 from './execution_script_executing_powershell.json';
import rule62 from './execution_suspicious_ms_office_child_process.json';
import rule63 from './execution_suspicious_ms_outlook_child_process.json';
import rule64 from './execution_unusual_network_connection_via_rundll32.json';
import rule65 from './execution_unusual_process_network_connection.json';
import rule66 from './execution_via_compiled_html_file.json';
import rule67 from './initial_access_rdp_remote_desktop_protocol_to_the_internet.json';
import rule68 from './initial_access_rpc_remote_procedure_call_from_the_internet.json';
import rule69 from './initial_access_rpc_remote_procedure_call_to_the_internet.json';
import rule70 from './initial_access_smb_windows_file_sharing_activity_to_the_internet.json';
import rule71 from './lateral_movement_direct_outbound_smb_connection.json';
import rule72 from './linux_hping_activity.json';
import rule73 from './linux_iodine_activity.json';
import rule74 from './linux_mknod_activity.json';
import rule75 from './linux_netcat_network_connection.json';
import rule76 from './linux_nmap_activity.json';
import rule77 from './linux_nping_activity.json';
import rule78 from './linux_process_started_in_temp_directory.json';
import rule79 from './linux_socat_activity.json';
import rule80 from './linux_strace_activity.json';
import rule81 from './persistence_adobe_hijack_persistence.json';
import rule82 from './persistence_kernel_module_activity.json';
import rule83 from './persistence_local_scheduled_task_commands.json';
import rule84 from './persistence_priv_escalation_via_accessibility_features.json';
import rule85 from './persistence_shell_activity_by_web_server.json';
import rule86 from './persistence_system_shells_via_services.json';
import rule87 from './persistence_user_account_creation.json';
import rule88 from './persistence_via_application_shimming.json';
import rule89 from './privilege_escalation_unusual_parentchild_relationship.json';
import rule90 from './defense_evasion_modification_of_boot_config.json';
import rule91 from './privilege_escalation_uac_bypass_event_viewer.json';
import rule92 from './discovery_net_command_system_account.json';
import rule93 from './execution_msxsl_network.json';
import rule94 from './command_and_control_certutil_network_connection.json';
import rule95 from './defense_evasion_cve_2020_0601.json';
import rule96 from './credential_access_credential_dumping_msbuild.json';
import rule97 from './defense_evasion_execution_msbuild_started_by_office_app.json';
import rule98 from './defense_evasion_execution_msbuild_started_by_script.json';
import rule99 from './defense_evasion_execution_msbuild_started_by_system_process.json';
import rule100 from './defense_evasion_execution_msbuild_started_renamed.json';
import rule101 from './defense_evasion_execution_msbuild_started_unusal_process.json';
import rule102 from './defense_evasion_injection_msbuild.json';
import rule103 from './execution_via_net_com_assemblies.json';
import rule104 from './ml_linux_anomalous_network_activity.json';
import rule105 from './ml_linux_anomalous_network_port_activity.json';
import rule106 from './ml_linux_anomalous_network_service.json';
import rule107 from './ml_linux_anomalous_network_url_activity.json';
import rule108 from './ml_linux_anomalous_process_all_hosts.json';
import rule109 from './ml_linux_anomalous_user_name.json';
import rule110 from './ml_packetbeat_dns_tunneling.json';
import rule111 from './ml_packetbeat_rare_dns_question.json';
import rule112 from './ml_packetbeat_rare_server_domain.json';
import rule113 from './ml_packetbeat_rare_urls.json';
import rule114 from './ml_packetbeat_rare_user_agent.json';
import rule115 from './ml_rare_process_by_host_linux.json';
import rule116 from './ml_rare_process_by_host_windows.json';
import rule117 from './ml_suspicious_login_activity.json';
import rule118 from './ml_windows_anomalous_network_activity.json';
import rule119 from './ml_windows_anomalous_path_activity.json';
import rule120 from './ml_windows_anomalous_process_all_hosts.json';
import rule121 from './ml_windows_anomalous_process_creation.json';
import rule122 from './ml_windows_anomalous_script.json';
import rule123 from './ml_windows_anomalous_service.json';
import rule124 from './ml_windows_anomalous_user_name.json';
import rule125 from './ml_windows_rare_user_runas_event.json';
import rule126 from './ml_windows_rare_user_type10_remote_login.json';
import rule127 from './execution_suspicious_pdf_reader.json';
import rule128 from './privilege_escalation_sudoers_file_mod.json';
import rule129 from './execution_python_tty_shell.json';
import rule130 from './execution_perl_tty_shell.json';
import rule131 from './defense_evasion_base16_or_base32_encoding_or_decoding_activity.json';
import rule132 from './defense_evasion_base64_encoding_or_decoding_activity.json';
import rule133 from './defense_evasion_hex_encoding_or_decoding_activity.json';
import rule134 from './defense_evasion_file_mod_writable_dir.json';
import rule135 from './defense_evasion_disable_selinux_attempt.json';
import rule136 from './discovery_kernel_module_enumeration.json';
import rule137 from './lateral_movement_telnet_network_activity_external.json';
import rule138 from './lateral_movement_telnet_network_activity_internal.json';
import rule139 from './privilege_escalation_setgid_bit_set_via_chmod.json';
import rule140 from './privilege_escalation_setuid_bit_set_via_chmod.json';
import rule141 from './defense_evasion_attempt_to_disable_iptables_or_firewall.json';
import rule142 from './defense_evasion_kernel_module_removal.json';
import rule143 from './defense_evasion_attempt_to_disable_syslog_service.json';
import rule144 from './defense_evasion_file_deletion_via_shred.json';
import rule145 from './discovery_virtual_machine_fingerprinting.json';
import rule146 from './defense_evasion_hidden_file_dir_tmp.json';
import rule147 from './defense_evasion_deletion_of_bash_command_line_history.json';
import rule148 from './impact_cloudwatch_log_group_deletion.json';
import rule149 from './impact_cloudwatch_log_stream_deletion.json';
import rule150 from './impact_rds_instance_cluster_stoppage.json';
import rule151 from './persistence_attempt_to_deactivate_mfa_for_okta_user_account.json';
import rule152 from './persistence_rds_cluster_creation.json';
import rule153 from './credential_access_attempted_bypass_of_okta_mfa.json';
import rule154 from './defense_evasion_waf_acl_deletion.json';
import rule155 from './impact_attempt_to_revoke_okta_api_token.json';
import rule156 from './impact_iam_group_deletion.json';
import rule157 from './impact_possible_okta_dos_attack.json';
import rule158 from './impact_rds_cluster_deletion.json';
import rule159 from './initial_access_suspicious_activity_reported_by_okta_user.json';
import rule160 from './okta_attempt_to_deactivate_okta_mfa_rule.json';
import rule161 from './okta_attempt_to_modify_okta_mfa_rule.json';
import rule162 from './okta_attempt_to_modify_okta_network_zone.json';
import rule163 from './okta_attempt_to_modify_okta_policy.json';
import rule164 from './okta_threat_detected_by_okta_threatinsight.json';
import rule165 from './persistence_administrator_privileges_assigned_to_okta_group.json';
import rule166 from './persistence_attempt_to_create_okta_api_token.json';
import rule167 from './persistence_attempt_to_deactivate_okta_policy.json';
import rule168 from './persistence_attempt_to_reset_mfa_factors_for_okta_user_account.json';
import rule169 from './defense_evasion_cloudtrail_logging_deleted.json';
import rule170 from './defense_evasion_ec2_network_acl_deletion.json';
import rule171 from './impact_iam_deactivate_mfa_device.json';
import rule172 from './defense_evasion_s3_bucket_configuration_deletion.json';
import rule173 from './defense_evasion_guardduty_detector_deletion.json';
import rule174 from './okta_attempt_to_delete_okta_policy.json';
import rule175 from './credential_access_iam_user_addition_to_group.json';
import rule176 from './persistence_ec2_network_acl_creation.json';
import rule177 from './impact_ec2_disable_ebs_encryption.json';
import rule178 from './persistence_iam_group_creation.json';
import rule179 from './defense_evasion_waf_rule_or_rule_group_deletion.json';
import rule180 from './collection_cloudtrail_logging_created.json';
import rule181 from './defense_evasion_cloudtrail_logging_suspended.json';
import rule182 from './impact_cloudtrail_logging_updated.json';
import rule183 from './initial_access_console_login_root.json';
import rule184 from './defense_evasion_cloudwatch_alarm_deletion.json';
import rule185 from './defense_evasion_ec2_flow_log_deletion.json';
import rule186 from './defense_evasion_configuration_recorder_stopped.json';
import rule187 from './exfiltration_ec2_snapshot_change_activity.json';
import rule188 from './defense_evasion_config_service_rule_deletion.json';
import rule189 from './okta_attempt_to_modify_or_delete_application_sign_on_policy.json';
import rule190 from './initial_access_password_recovery.json';
import rule191 from './credential_access_secretsmanager_getsecretvalue.json';
import rule192 from './execution_via_system_manager.json';
import rule193 from './privilege_escalation_root_login_without_mfa.json';
import rule194 from './privilege_escalation_updateassumerolepolicy.json';
import rule195 from './elastic_endpoint.json';
import rule196 from './external_alerts.json';
import rule197 from './ml_cloudtrail_error_message_spike.json';
import rule198 from './ml_cloudtrail_rare_error_code.json';
import rule199 from './ml_cloudtrail_rare_method_by_city.json';
import rule200 from './ml_cloudtrail_rare_method_by_country.json';
import rule201 from './ml_cloudtrail_rare_method_by_user.json';

export const rawRules = [
  rule1,
  rule2,
  rule3,
  rule4,
  rule5,
  rule6,
  rule7,
  rule8,
  rule9,
  rule10,
  rule11,
  rule12,
  rule13,
  rule14,
  rule15,
  rule16,
  rule17,
  rule18,
  rule19,
  rule20,
  rule21,
  rule22,
  rule23,
  rule24,
  rule25,
  rule26,
  rule27,
  rule28,
  rule29,
  rule30,
  rule31,
  rule32,
  rule33,
  rule34,
  rule35,
  rule36,
  rule37,
  rule38,
  rule39,
  rule40,
  rule41,
  rule42,
  rule43,
  rule44,
  rule45,
  rule46,
  rule47,
  rule48,
  rule49,
  rule50,
  rule51,
  rule52,
  rule53,
  rule54,
  rule55,
  rule56,
  rule57,
  rule58,
  rule59,
  rule60,
  rule61,
  rule62,
  rule63,
  rule64,
  rule65,
  rule66,
  rule67,
  rule68,
  rule69,
  rule70,
  rule71,
  rule72,
  rule73,
  rule74,
  rule75,
  rule76,
  rule77,
  rule78,
  rule79,
  rule80,
  rule81,
  rule82,
  rule83,
  rule84,
  rule85,
  rule86,
  rule87,
  rule88,
  rule89,
  rule90,
  rule91,
  rule92,
  rule93,
  rule94,
  rule95,
  rule96,
  rule97,
  rule98,
  rule99,
  rule100,
  rule101,
  rule102,
  rule103,
  rule104,
  rule105,
  rule106,
  rule107,
  rule108,
  rule109,
  rule110,
  rule111,
  rule112,
  rule113,
  rule114,
  rule115,
  rule116,
  rule117,
  rule118,
  rule119,
  rule120,
  rule121,
  rule122,
  rule123,
  rule124,
  rule125,
  rule126,
  rule127,
  rule128,
  rule129,
  rule130,
  rule131,
  rule132,
  rule133,
  rule134,
  rule135,
  rule136,
  rule137,
  rule138,
  rule139,
  rule140,
  rule141,
  rule142,
  rule143,
  rule144,
  rule145,
  rule146,
  rule147,
  rule148,
  rule149,
  rule150,
  rule151,
  rule152,
  rule153,
  rule154,
  rule155,
  rule156,
  rule157,
  rule158,
  rule159,
  rule160,
  rule161,
  rule162,
  rule163,
  rule164,
  rule165,
  rule166,
  rule167,
  rule168,
  rule169,
  rule170,
  rule171,
  rule172,
  rule173,
  rule174,
  rule175,
  rule176,
  rule177,
  rule178,
  rule179,
  rule180,
  rule181,
  rule182,
  rule183,
  rule184,
  rule185,
  rule186,
  rule187,
  rule188,
  rule189,
  rule190,
  rule191,
  rule192,
  rule193,
  rule194,
  rule195,
  rule196,
  rule197,
  rule198,
  rule199,
  rule200,
  rule201,
];
