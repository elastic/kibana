/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Auto generated file from scripts/regen_prepackage_rules_index.sh
// Do not hand edit. Run that script to regenerate package information instead

import rule1 from './403_response_to_a_post.json';
import rule2 from './405_response_method_not_allowed.json';
import rule3 from './elastic_endpoint_security_adversary_behavior_detected.json';
import rule4 from './elastic_endpoint_security_cred_dumping_detected.json';
import rule5 from './elastic_endpoint_security_cred_dumping_prevented.json';
import rule6 from './elastic_endpoint_security_cred_manipulation_detected.json';
import rule7 from './elastic_endpoint_security_cred_manipulation_prevented.json';
import rule8 from './elastic_endpoint_security_exploit_detected.json';
import rule9 from './elastic_endpoint_security_exploit_prevented.json';
import rule10 from './elastic_endpoint_security_malware_detected.json';
import rule11 from './elastic_endpoint_security_malware_prevented.json';
import rule12 from './elastic_endpoint_security_permission_theft_detected.json';
import rule13 from './elastic_endpoint_security_permission_theft_prevented.json';
import rule14 from './elastic_endpoint_security_process_injection_detected.json';
import rule15 from './elastic_endpoint_security_process_injection_prevented.json';
import rule16 from './elastic_endpoint_security_ransomware_detected.json';
import rule17 from './elastic_endpoint_security_ransomware_prevented.json';
import rule18 from './eql_adding_the_hidden_file_attribute_with_via_attribexe.json';
import rule19 from './eql_adobe_hijack_persistence.json';
import rule20 from './eql_clearing_windows_event_logs.json';
import rule21 from './eql_delete_volume_usn_journal_with_fsutil.json';
import rule22 from './eql_deleting_backup_catalogs_with_wbadmin.json';
import rule23 from './eql_direct_outbound_smb_connection.json';
import rule24 from './eql_disable_windows_firewall_rules_with_netsh.json';
import rule25 from './eql_encoding_or_decoding_files_via_certutil.json';
import rule26 from './eql_local_scheduled_task_commands.json';
import rule27 from './eql_local_service_commands.json';
import rule28 from './eql_msbuild_making_network_connections.json';
import rule29 from './eql_mshta_making_network_connections.json';
import rule30 from './eql_psexec_lateral_movement_command.json';
import rule31 from './eql_suspicious_ms_office_child_process.json';
import rule32 from './eql_suspicious_ms_outlook_child_process.json';
import rule33 from './eql_system_shells_via_services.json';
import rule34 from './eql_unusual_network_connection_via_rundll32.json';
import rule35 from './eql_unusual_parentchild_relationship.json';
import rule36 from './eql_unusual_process_network_connection.json';
import rule37 from './eql_user_account_creation.json';
import rule38 from './eql_volume_shadow_copy_deletion_via_vssadmin.json';
import rule39 from './eql_volume_shadow_copy_deletion_via_wmic.json';
import rule40 from './eql_windows_script_executing_powershell.json';
import rule41 from './linux_anomalous_network_activity.json';
import rule42 from './linux_anomalous_network_port_activity.json';
import rule43 from './linux_anomalous_network_service.json';
import rule44 from './linux_anomalous_network_url_activity.json';
import rule45 from './linux_anomalous_process_all_hosts.json';
import rule46 from './linux_anomalous_user_name.json';
import rule47 from './linux_attempt_to_disable_iptables_or_firewall.json';
import rule48 from './linux_attempt_to_disable_syslog_service.json';
import rule49 from './linux_base16_or_base32_encoding_or_decoding_activity.json';
import rule50 from './linux_base64_encoding_or_decoding_activity.json';
import rule51 from './linux_disable_selinux_attempt.json';
import rule52 from './linux_file_deletion_via_shred.json';
import rule53 from './linux_file_mod_writable_dir.json';
import rule54 from './linux_hex_encoding_or_decoding_activity.json';
import rule55 from './linux_hping_activity.json';
import rule56 from './linux_iodine_activity.json';
import rule57 from './linux_kernel_module_activity.json';
import rule58 from './linux_kernel_module_enumeration.json';
import rule59 from './linux_kernel_module_removal.json';
import rule60 from './linux_mknod_activity.json';
import rule61 from './linux_netcat_network_connection.json';
import rule62 from './linux_nmap_activity.json';
import rule63 from './linux_nping_activity.json';
import rule64 from './linux_perl_tty_shell.json';
import rule65 from './linux_process_started_in_temp_directory.json';
import rule66 from './linux_python_tty_shell.json';
import rule67 from './linux_setgid_bit_set_via_chmod.json';
import rule68 from './linux_setuid_bit_set_via_chmod.json';
import rule69 from './linux_shell_activity_by_web_server.json';
import rule70 from './linux_socat_activity.json';
import rule71 from './linux_strace_activity.json';
import rule72 from './linux_sudoers_file_mod.json';
import rule73 from './linux_tcpdump_activity.json';
import rule74 from './linux_telnet_network_activity_external.json';
import rule75 from './linux_telnet_network_activity_internal.json';
import rule76 from './linux_virtual_machine_fingerprinting.json';
import rule77 from './linux_whoami_commmand.json';
import rule78 from './network_dns_directly_to_the_internet.json';
import rule79 from './network_ftp_file_transfer_protocol_activity_to_the_internet.json';
import rule80 from './network_irc_internet_relay_chat_protocol_activity_to_the_internet.json';
import rule81 from './network_nat_traversal_port_activity.json';
import rule82 from './network_port_26_activity.json';
import rule83 from './network_port_8000_activity_to_the_internet.json';
import rule84 from './network_pptp_point_to_point_tunneling_protocol_activity.json';
import rule85 from './network_proxy_port_activity_to_the_internet.json';
import rule86 from './network_rdp_remote_desktop_protocol_from_the_internet.json';
import rule87 from './network_rdp_remote_desktop_protocol_to_the_internet.json';
import rule88 from './network_rpc_remote_procedure_call_from_the_internet.json';
import rule89 from './network_rpc_remote_procedure_call_to_the_internet.json';
import rule90 from './network_smb_windows_file_sharing_activity_to_the_internet.json';
import rule91 from './network_smtp_to_the_internet.json';
import rule92 from './network_sql_server_port_activity_to_the_internet.json';
import rule93 from './network_ssh_secure_shell_from_the_internet.json';
import rule94 from './network_ssh_secure_shell_to_the_internet.json';
import rule95 from './network_telnet_port_activity.json';
import rule96 from './network_tor_activity_to_the_internet.json';
import rule97 from './network_vnc_virtual_network_computing_from_the_internet.json';
import rule98 from './network_vnc_virtual_network_computing_to_the_internet.json';
import rule99 from './null_user_agent.json';
import rule100 from './packetbeat_dns_tunneling.json';
import rule101 from './packetbeat_rare_dns_question.json';
import rule102 from './packetbeat_rare_server_domain.json';
import rule103 from './packetbeat_rare_urls.json';
import rule104 from './packetbeat_rare_user_agent.json';
import rule105 from './rare_process_by_host_linux.json';
import rule106 from './rare_process_by_host_windows.json';
import rule107 from './sqlmap_user_agent.json';
import rule108 from './suspicious_login_activity.json';
import rule109 from './windows_anomalous_network_activity.json';
import rule110 from './windows_anomalous_path_activity.json';
import rule111 from './windows_anomalous_process_all_hosts.json';
import rule112 from './windows_anomalous_process_creation.json';
import rule113 from './windows_anomalous_script.json';
import rule114 from './windows_anomalous_service.json';
import rule115 from './windows_anomalous_user_name.json';
import rule116 from './windows_certutil_network_connection.json';
import rule117 from './windows_command_prompt_connecting_to_the_internet.json';
import rule118 from './windows_command_shell_started_by_powershell.json';
import rule119 from './windows_command_shell_started_by_svchost.json';
import rule120 from './windows_credential_dumping_msbuild.json';
import rule121 from './windows_cve_2020_0601.json';
import rule122 from './windows_defense_evasion_via_filter_manager.json';
import rule123 from './windows_execution_msbuild_started_by_office_app.json';
import rule124 from './windows_execution_msbuild_started_by_script.json';
import rule125 from './windows_execution_msbuild_started_by_system_process.json';
import rule126 from './windows_execution_msbuild_started_renamed.json';
import rule127 from './windows_execution_msbuild_started_unusal_process.json';
import rule128 from './windows_execution_via_compiled_html_file.json';
import rule129 from './windows_execution_via_net_com_assemblies.json';
import rule130 from './windows_execution_via_trusted_developer_utilities.json';
import rule131 from './windows_html_help_executable_program_connecting_to_the_internet.json';
import rule132 from './windows_injection_msbuild.json';
import rule133 from './windows_misc_lolbin_connecting_to_the_internet.json';
import rule134 from './windows_modification_of_boot_config.json';
import rule135 from './windows_msxsl_network.json';
import rule136 from './windows_net_command_system_account.json';
import rule137 from './windows_persistence_via_application_shimming.json';
import rule138 from './windows_priv_escalation_via_accessibility_features.json';
import rule139 from './windows_process_discovery_via_tasklist_command.json';
import rule140 from './windows_rare_user_runas_event.json';
import rule141 from './windows_rare_user_type10_remote_login.json';
import rule142 from './windows_register_server_program_connecting_to_the_internet.json';
import rule143 from './windows_suspicious_pdf_reader.json';
import rule144 from './windows_uac_bypass_event_viewer.json';
import rule145 from './windows_whoami_command_activity.json';
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
];
