/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Auto generated file from either:
// - scripts/regen_prepackage_rules_index.sh
// - detection-rules repo using CLI command build-release
// Do not hand edit. Run script/command to regenerate package information instead

import rule1 from './credential_access_access_to_browser_credentials_procargs.json';
import rule2 from './defense_evasion_tcc_bypass_mounted_apfs_access.json';
import rule3 from './persistence_enable_root_account.json';
import rule4 from './defense_evasion_unload_endpointsecurity_kext.json';
import rule5 from './persistence_account_creation_hide_at_logon.json';
import rule6 from './persistence_creation_hidden_login_item_osascript.json';
import rule7 from './persistence_evasion_hidden_launch_agent_deamon_creation.json';
import rule8 from './privilege_escalation_local_user_added_to_admin.json';
import rule9 from './credential_access_keychain_pwd_retrieval_security_cmd.json';
import rule10 from './credential_access_systemkey_dumping.json';
import rule11 from './execution_defense_evasion_electron_app_childproc_node_js.json';
import rule12 from './execution_revershell_via_shell_cmd.json';
import rule13 from './persistence_defense_evasion_hidden_launch_agent_deamon_logonitem_process.json';
import rule14 from './privilege_escalation_persistence_phantom_dll.json';
import rule15 from './defense_evasion_privilege_escalation_privacy_pref_sshd_fulldiskaccess.json';
import rule16 from './lateral_movement_credential_access_kerberos_bifrostconsole.json';
import rule17 from './lateral_movement_vpn_connection_attempt.json';
import rule18 from './apm_403_response_to_a_post.json';
import rule19 from './apm_405_response_method_not_allowed.json';
import rule20 from './apm_null_user_agent.json';
import rule21 from './apm_sqlmap_user_agent.json';
import rule22 from './command_and_control_dns_directly_to_the_internet.json';
import rule23 from './command_and_control_nat_traversal_port_activity.json';
import rule24 from './command_and_control_port_26_activity.json';
import rule25 from './command_and_control_rdp_remote_desktop_protocol_from_the_internet.json';
import rule26 from './command_and_control_telnet_port_activity.json';
import rule27 from './command_and_control_vnc_virtual_network_computing_from_the_internet.json';
import rule28 from './command_and_control_vnc_virtual_network_computing_to_the_internet.json';
import rule29 from './defense_evasion_adding_the_hidden_file_attribute_with_via_attribexe.json';
import rule30 from './defense_evasion_clearing_windows_event_logs.json';
import rule31 from './defense_evasion_delete_volume_usn_journal_with_fsutil.json';
import rule32 from './defense_evasion_deleting_backup_catalogs_with_wbadmin.json';
import rule33 from './defense_evasion_disable_windows_firewall_rules_with_netsh.json';
import rule34 from './defense_evasion_misc_lolbin_connecting_to_the_internet.json';
import rule35 from './defense_evasion_msbuild_making_network_connections.json';
import rule36 from './defense_evasion_suspicious_certutil_commands.json';
import rule37 from './defense_evasion_unusual_network_connection_via_rundll32.json';
import rule38 from './defense_evasion_unusual_process_network_connection.json';
import rule39 from './defense_evasion_via_filter_manager.json';
import rule40 from './defense_evasion_volume_shadow_copy_deletion_via_wmic.json';
import rule41 from './discovery_whoami_command_activity.json';
import rule42 from './endgame_adversary_behavior_detected.json';
import rule43 from './endgame_cred_dumping_detected.json';
import rule44 from './endgame_cred_dumping_prevented.json';
import rule45 from './endgame_cred_manipulation_detected.json';
import rule46 from './endgame_cred_manipulation_prevented.json';
import rule47 from './endgame_exploit_detected.json';
import rule48 from './endgame_exploit_prevented.json';
import rule49 from './endgame_malware_detected.json';
import rule50 from './endgame_malware_prevented.json';
import rule51 from './endgame_permission_theft_detected.json';
import rule52 from './endgame_permission_theft_prevented.json';
import rule53 from './endgame_process_injection_detected.json';
import rule54 from './endgame_process_injection_prevented.json';
import rule55 from './endgame_ransomware_detected.json';
import rule56 from './endgame_ransomware_prevented.json';
import rule57 from './execution_command_prompt_connecting_to_the_internet.json';
import rule58 from './execution_command_shell_started_by_svchost.json';
import rule59 from './execution_html_help_executable_program_connecting_to_the_internet.json';
import rule60 from './execution_psexec_lateral_movement_command.json';
import rule61 from './execution_register_server_program_connecting_to_the_internet.json';
import rule62 from './execution_via_compiled_html_file.json';
import rule63 from './impact_volume_shadow_copy_deletion_via_vssadmin.json';
import rule64 from './initial_access_rpc_remote_procedure_call_from_the_internet.json';
import rule65 from './initial_access_rpc_remote_procedure_call_to_the_internet.json';
import rule66 from './initial_access_script_executing_powershell.json';
import rule67 from './initial_access_smb_windows_file_sharing_activity_to_the_internet.json';
import rule68 from './initial_access_suspicious_ms_office_child_process.json';
import rule69 from './initial_access_suspicious_ms_outlook_child_process.json';
import rule70 from './lateral_movement_direct_outbound_smb_connection.json';
import rule71 from './lateral_movement_service_control_spawned_script_int.json';
import rule72 from './linux_hping_activity.json';
import rule73 from './linux_iodine_activity.json';
import rule74 from './linux_netcat_network_connection.json';
import rule75 from './linux_nping_activity.json';
import rule76 from './linux_process_started_in_temp_directory.json';
import rule77 from './linux_strace_activity.json';
import rule78 from './persistence_adobe_hijack_persistence.json';
import rule79 from './persistence_local_scheduled_task_creation.json';
import rule80 from './persistence_priv_escalation_via_accessibility_features.json';
import rule81 from './persistence_shell_activity_by_web_server.json';
import rule82 from './persistence_system_shells_via_services.json';
import rule83 from './persistence_user_account_creation.json';
import rule84 from './persistence_via_application_shimming.json';
import rule85 from './privilege_escalation_unusual_parentchild_relationship.json';
import rule86 from './defense_evasion_modification_of_boot_config.json';
import rule87 from './privilege_escalation_uac_bypass_event_viewer.json';
import rule88 from './defense_evasion_msxsl_network.json';
import rule89 from './discovery_net_command_system_account.json';
import rule90 from './command_and_control_certutil_network_connection.json';
import rule91 from './defense_evasion_cve_2020_0601.json';
import rule92 from './credential_access_credential_dumping_msbuild.json';
import rule93 from './defense_evasion_execution_msbuild_started_by_office_app.json';
import rule94 from './defense_evasion_execution_msbuild_started_by_script.json';
import rule95 from './defense_evasion_execution_msbuild_started_by_system_process.json';
import rule96 from './defense_evasion_execution_msbuild_started_renamed.json';
import rule97 from './defense_evasion_execution_msbuild_started_unusal_process.json';
import rule98 from './defense_evasion_injection_msbuild.json';
import rule99 from './ml_linux_anomalous_network_activity.json';
import rule100 from './ml_linux_anomalous_network_port_activity.json';
import rule101 from './ml_linux_anomalous_network_service.json';
import rule102 from './ml_linux_anomalous_network_url_activity.json';
import rule103 from './ml_linux_anomalous_process_all_hosts.json';
import rule104 from './ml_linux_anomalous_user_name.json';
import rule105 from './ml_packetbeat_dns_tunneling.json';
import rule106 from './ml_packetbeat_rare_dns_question.json';
import rule107 from './ml_packetbeat_rare_server_domain.json';
import rule108 from './ml_packetbeat_rare_urls.json';
import rule109 from './ml_packetbeat_rare_user_agent.json';
import rule110 from './ml_rare_process_by_host_linux.json';
import rule111 from './ml_rare_process_by_host_windows.json';
import rule112 from './ml_suspicious_login_activity.json';
import rule113 from './ml_windows_anomalous_network_activity.json';
import rule114 from './ml_windows_anomalous_path_activity.json';
import rule115 from './ml_windows_anomalous_process_all_hosts.json';
import rule116 from './ml_windows_anomalous_process_creation.json';
import rule117 from './ml_windows_anomalous_script.json';
import rule118 from './ml_windows_anomalous_service.json';
import rule119 from './ml_windows_anomalous_user_name.json';
import rule120 from './ml_windows_rare_user_runas_event.json';
import rule121 from './ml_windows_rare_user_type10_remote_login.json';
import rule122 from './execution_suspicious_pdf_reader.json';
import rule123 from './privilege_escalation_sudoers_file_mod.json';
import rule124 from './defense_evasion_iis_httplogging_disabled.json';
import rule125 from './execution_python_tty_shell.json';
import rule126 from './execution_perl_tty_shell.json';
import rule127 from './defense_evasion_base16_or_base32_encoding_or_decoding_activity.json';
import rule128 from './defense_evasion_file_mod_writable_dir.json';
import rule129 from './defense_evasion_disable_selinux_attempt.json';
import rule130 from './discovery_kernel_module_enumeration.json';
import rule131 from './lateral_movement_telnet_network_activity_external.json';
import rule132 from './lateral_movement_telnet_network_activity_internal.json';
import rule133 from './privilege_escalation_setuid_setgid_bit_set_via_chmod.json';
import rule134 from './defense_evasion_attempt_to_disable_iptables_or_firewall.json';
import rule135 from './defense_evasion_kernel_module_removal.json';
import rule136 from './defense_evasion_attempt_to_disable_syslog_service.json';
import rule137 from './defense_evasion_file_deletion_via_shred.json';
import rule138 from './discovery_virtual_machine_fingerprinting.json';
import rule139 from './defense_evasion_hidden_file_dir_tmp.json';
import rule140 from './defense_evasion_deletion_of_bash_command_line_history.json';
import rule141 from './impact_cloudwatch_log_group_deletion.json';
import rule142 from './impact_cloudwatch_log_stream_deletion.json';
import rule143 from './impact_rds_instance_cluster_stoppage.json';
import rule144 from './persistence_attempt_to_deactivate_mfa_for_okta_user_account.json';
import rule145 from './persistence_rds_cluster_creation.json';
import rule146 from './credential_access_attempted_bypass_of_okta_mfa.json';
import rule147 from './defense_evasion_waf_acl_deletion.json';
import rule148 from './impact_attempt_to_revoke_okta_api_token.json';
import rule149 from './impact_iam_group_deletion.json';
import rule150 from './impact_possible_okta_dos_attack.json';
import rule151 from './impact_rds_cluster_deletion.json';
import rule152 from './initial_access_suspicious_activity_reported_by_okta_user.json';
import rule153 from './okta_attempt_to_deactivate_okta_policy.json';
import rule154 from './okta_attempt_to_deactivate_okta_policy_rule.json';
import rule155 from './okta_attempt_to_modify_okta_network_zone.json';
import rule156 from './okta_attempt_to_modify_okta_policy.json';
import rule157 from './okta_attempt_to_modify_okta_policy_rule.json';
import rule158 from './okta_threat_detected_by_okta_threatinsight.json';
import rule159 from './persistence_administrator_privileges_assigned_to_okta_group.json';
import rule160 from './persistence_attempt_to_create_okta_api_token.json';
import rule161 from './persistence_attempt_to_reset_mfa_factors_for_okta_user_account.json';
import rule162 from './defense_evasion_cloudtrail_logging_deleted.json';
import rule163 from './defense_evasion_ec2_network_acl_deletion.json';
import rule164 from './impact_iam_deactivate_mfa_device.json';
import rule165 from './defense_evasion_s3_bucket_configuration_deletion.json';
import rule166 from './defense_evasion_guardduty_detector_deletion.json';
import rule167 from './okta_attempt_to_delete_okta_policy.json';
import rule168 from './credential_access_iam_user_addition_to_group.json';
import rule169 from './persistence_ec2_network_acl_creation.json';
import rule170 from './impact_ec2_disable_ebs_encryption.json';
import rule171 from './persistence_iam_group_creation.json';
import rule172 from './defense_evasion_waf_rule_or_rule_group_deletion.json';
import rule173 from './collection_cloudtrail_logging_created.json';
import rule174 from './defense_evasion_cloudtrail_logging_suspended.json';
import rule175 from './impact_cloudtrail_logging_updated.json';
import rule176 from './initial_access_console_login_root.json';
import rule177 from './defense_evasion_cloudwatch_alarm_deletion.json';
import rule178 from './defense_evasion_ec2_flow_log_deletion.json';
import rule179 from './defense_evasion_configuration_recorder_stopped.json';
import rule180 from './exfiltration_ec2_snapshot_change_activity.json';
import rule181 from './defense_evasion_config_service_rule_deletion.json';
import rule182 from './okta_attempt_to_modify_or_delete_application_sign_on_policy.json';
import rule183 from './command_and_control_download_rar_powershell_from_internet.json';
import rule184 from './initial_access_password_recovery.json';
import rule185 from './command_and_control_cobalt_strike_beacon.json';
import rule186 from './command_and_control_fin7_c2_behavior.json';
import rule187 from './command_and_control_halfbaked_beacon.json';
import rule188 from './credential_access_secretsmanager_getsecretvalue.json';
import rule189 from './initial_access_via_system_manager.json';
import rule190 from './privilege_escalation_root_login_without_mfa.json';
import rule191 from './privilege_escalation_updateassumerolepolicy.json';
import rule192 from './impact_hosts_file_modified.json';
import rule193 from './elastic_endpoint_security.json';
import rule194 from './external_alerts.json';
import rule195 from './initial_access_login_failures.json';
import rule196 from './initial_access_login_location.json';
import rule197 from './initial_access_login_sessions.json';
import rule198 from './initial_access_login_time.json';
import rule199 from './ml_cloudtrail_error_message_spike.json';
import rule200 from './ml_cloudtrail_rare_error_code.json';
import rule201 from './ml_cloudtrail_rare_method_by_city.json';
import rule202 from './ml_cloudtrail_rare_method_by_country.json';
import rule203 from './ml_cloudtrail_rare_method_by_user.json';
import rule204 from './credential_access_aws_iam_assume_role_brute_force.json';
import rule205 from './credential_access_okta_brute_force_or_password_spraying.json';
import rule206 from './initial_access_unusual_dns_service_children.json';
import rule207 from './initial_access_unusual_dns_service_file_writes.json';
import rule208 from './lateral_movement_dns_server_overflow.json';
import rule209 from './credential_access_root_console_failure_brute_force.json';
import rule210 from './initial_access_unsecure_elasticsearch_node.json';
import rule211 from './credential_access_domain_backup_dpapi_private_keys.json';
import rule212 from './persistence_gpo_schtask_service_creation.json';
import rule213 from './credential_access_credentials_keychains.json';
import rule214 from './credential_access_kerberosdump_kcc.json';
import rule215 from './defense_evasion_attempt_del_quarantine_attrib.json';
import rule216 from './execution_suspicious_psexesvc.json';
import rule217 from './execution_via_xp_cmdshell_mssql_stored_procedure.json';
import rule218 from './privilege_escalation_printspooler_service_suspicious_file.json';
import rule219 from './privilege_escalation_printspooler_suspicious_spl_file.json';
import rule220 from './defense_evasion_azure_diagnostic_settings_deletion.json';
import rule221 from './execution_command_virtual_machine.json';
import rule222 from './execution_via_hidden_shell_conhost.json';
import rule223 from './impact_resource_group_deletion.json';
import rule224 from './persistence_via_telemetrycontroller_scheduledtask_hijack.json';
import rule225 from './persistence_via_update_orchestrator_service_hijack.json';
import rule226 from './collection_update_event_hub_auth_rule.json';
import rule227 from './credential_access_iis_apppoolsa_pwd_appcmd.json';
import rule228 from './credential_access_iis_connectionstrings_dumping.json';
import rule229 from './defense_evasion_event_hub_deletion.json';
import rule230 from './defense_evasion_firewall_policy_deletion.json';
import rule231 from './defense_evasion_sdelete_like_filename_rename.json';
import rule232 from './lateral_movement_remote_ssh_login_enabled.json';
import rule233 from './persistence_azure_automation_account_created.json';
import rule234 from './persistence_azure_automation_runbook_created_or_modified.json';
import rule235 from './persistence_azure_automation_webhook_created.json';
import rule236 from './privilege_escalation_uac_bypass_diskcleanup_hijack.json';
import rule237 from './credential_access_attempts_to_brute_force_okta_user_account.json';
import rule238 from './credential_access_storage_account_key_regenerated.json';
import rule239 from './defense_evasion_suspicious_okta_user_password_reset_or_unlock_attempts.json';
import rule240 from './defense_evasion_system_critical_proc_abnormal_file_activity.json';
import rule241 from './defense_evasion_unusual_system_vp_child_program.json';
import rule242 from './discovery_blob_container_access_mod.json';
import rule243 from './persistence_mfa_disabled_for_azure_user.json';
import rule244 from './persistence_user_added_as_owner_for_azure_application.json';
import rule245 from './persistence_user_added_as_owner_for_azure_service_principal.json';
import rule246 from './defense_evasion_dotnet_compiler_parent_process.json';
import rule247 from './defense_evasion_suspicious_managedcode_host_process.json';
import rule248 from './execution_command_shell_started_by_unusual_process.json';
import rule249 from './defense_evasion_masquerading_as_elastic_endpoint_process.json';
import rule250 from './defense_evasion_masquerading_suspicious_werfault_childproc.json';
import rule251 from './defense_evasion_masquerading_werfault.json';
import rule252 from './credential_access_key_vault_modified.json';
import rule253 from './credential_access_mimikatz_memssp_default_logs.json';
import rule254 from './defense_evasion_code_injection_conhost.json';
import rule255 from './defense_evasion_network_watcher_deletion.json';
import rule256 from './initial_access_external_guest_user_invite.json';
import rule257 from './defense_evasion_masquerading_renamed_autoit.json';
import rule258 from './impact_azure_automation_runbook_deleted.json';
import rule259 from './initial_access_consent_grant_attack_via_azure_registered_application.json';
import rule260 from './persistence_azure_conditional_access_policy_modified.json';
import rule261 from './persistence_azure_privileged_identity_management_role_modified.json';
import rule262 from './command_and_control_teamviewer_remote_file_copy.json';
import rule263 from './defense_evasion_installutil_beacon.json';
import rule264 from './defense_evasion_mshta_beacon.json';
import rule265 from './defense_evasion_network_connection_from_windows_binary.json';
import rule266 from './defense_evasion_rundll32_no_arguments.json';
import rule267 from './defense_evasion_suspicious_scrobj_load.json';
import rule268 from './defense_evasion_suspicious_wmi_script.json';
import rule269 from './execution_ms_office_written_file.json';
import rule270 from './execution_pdf_written_file.json';
import rule271 from './lateral_movement_cmd_service.json';
import rule272 from './persistence_app_compat_shim.json';
import rule273 from './command_and_control_remote_file_copy_desktopimgdownldr.json';
import rule274 from './command_and_control_remote_file_copy_mpcmdrun.json';
import rule275 from './defense_evasion_execution_suspicious_explorer_winword.json';
import rule276 from './defense_evasion_suspicious_zoom_child_process.json';
import rule277 from './ml_linux_anomalous_compiler_activity.json';
import rule278 from './ml_linux_anomalous_kernel_module_arguments.json';
import rule279 from './ml_linux_anomalous_sudo_activity.json';
import rule280 from './ml_linux_system_information_discovery.json';
import rule281 from './ml_linux_system_network_configuration_discovery.json';
import rule282 from './ml_linux_system_network_connection_discovery.json';
import rule283 from './ml_linux_system_process_discovery.json';
import rule284 from './ml_linux_system_user_discovery.json';
import rule285 from './discovery_post_exploitation_external_ip_lookup.json';
import rule286 from './initial_access_zoom_meeting_with_no_passcode.json';
import rule287 from './defense_evasion_gcp_logging_sink_deletion.json';
import rule288 from './defense_evasion_gcp_pub_sub_topic_deletion.json';
import rule289 from './defense_evasion_gcp_firewall_rule_created.json';
import rule290 from './defense_evasion_gcp_firewall_rule_deleted.json';
import rule291 from './defense_evasion_gcp_firewall_rule_modified.json';
import rule292 from './defense_evasion_gcp_logging_bucket_deletion.json';
import rule293 from './defense_evasion_gcp_storage_bucket_permissions_modified.json';
import rule294 from './impact_gcp_storage_bucket_deleted.json';
import rule295 from './initial_access_gcp_iam_custom_role_creation.json';
import rule296 from './persistence_gcp_iam_service_account_key_deletion.json';
import rule297 from './persistence_gcp_key_created_for_service_account.json';
import rule298 from './defense_evasion_gcp_storage_bucket_configuration_modified.json';
import rule299 from './exfiltration_gcp_logging_sink_modification.json';
import rule300 from './impact_gcp_iam_role_deletion.json';
import rule301 from './impact_gcp_service_account_deleted.json';
import rule302 from './impact_gcp_service_account_disabled.json';
import rule303 from './impact_gcp_virtual_private_cloud_network_deleted.json';
import rule304 from './impact_gcp_virtual_private_cloud_route_created.json';
import rule305 from './impact_gcp_virtual_private_cloud_route_deleted.json';
import rule306 from './ml_linux_anomalous_metadata_process.json';
import rule307 from './ml_linux_anomalous_metadata_user.json';
import rule308 from './ml_windows_anomalous_metadata_process.json';
import rule309 from './ml_windows_anomalous_metadata_user.json';
import rule310 from './persistence_gcp_service_account_created.json';
import rule311 from './collection_gcp_pub_sub_subscription_creation.json';
import rule312 from './collection_gcp_pub_sub_topic_creation.json';
import rule313 from './defense_evasion_gcp_pub_sub_subscription_deletion.json';
import rule314 from './persistence_azure_pim_user_added_global_admin.json';
import rule315 from './command_and_control_cobalt_strike_default_teamserver_cert.json';
import rule316 from './defense_evasion_enable_inbound_rdp_with_netsh.json';
import rule317 from './defense_evasion_execution_lolbas_wuauclt.json';
import rule318 from './privilege_escalation_unusual_svchost_childproc_childless.json';
import rule319 from './lateral_movement_rdp_tunnel_plink.json';
import rule320 from './privilege_escalation_uac_bypass_winfw_mmc_hijack.json';
import rule321 from './persistence_ms_office_addins_file.json';
import rule322 from './discovery_adfind_command_activity.json';
import rule323 from './discovery_security_software_wmic.json';
import rule324 from './execution_command_shell_via_rundll32.json';
import rule325 from './execution_suspicious_cmd_wmi.json';
import rule326 from './lateral_movement_via_startup_folder_rdp_smb.json';
import rule327 from './privilege_escalation_uac_bypass_com_interface_icmluautil.json';
import rule328 from './privilege_escalation_uac_bypass_mock_windir.json';
import rule329 from './defense_evasion_potential_processherpaderping.json';
import rule330 from './privilege_escalation_uac_bypass_dll_sideloading.json';
import rule331 from './execution_shared_modules_local_sxs_dll.json';
import rule332 from './privilege_escalation_uac_bypass_com_clipup.json';
import rule333 from './initial_access_via_explorer_suspicious_child_parent_args.json';
import rule334 from './execution_from_unusual_directory.json';
import rule335 from './execution_from_unusual_path_cmdline.json';
import rule336 from './credential_access_kerberoasting_unusual_process.json';
import rule337 from './discovery_peripheral_device.json';
import rule338 from './lateral_movement_mount_hidden_or_webdav_share_net.json';
import rule339 from './defense_evasion_deleting_websvr_access_logs.json';
import rule340 from './defense_evasion_log_files_deleted.json';
import rule341 from './defense_evasion_timestomp_touch.json';
import rule342 from './lateral_movement_dcom_hta.json';
import rule343 from './lateral_movement_execution_via_file_shares_sequence.json';
import rule344 from './privilege_escalation_uac_bypass_com_ieinstal.json';
import rule345 from './command_and_control_common_webservices.json';
import rule346 from './command_and_control_encrypted_channel_freesslcert.json';
import rule347 from './defense_evasion_process_termination_followed_by_deletion.json';
import rule348 from './lateral_movement_remote_file_copy_hidden_share.json';
import rule349 from './attempt_to_deactivate_okta_network_zone.json';
import rule350 from './attempt_to_delete_okta_network_zone.json';
import rule351 from './lateral_movement_dcom_mmc20.json';
import rule352 from './lateral_movement_dcom_shellwindow_shellbrowserwindow.json';
import rule353 from './okta_attempt_to_deactivate_okta_application.json';
import rule354 from './okta_attempt_to_delete_okta_application.json';
import rule355 from './okta_attempt_to_delete_okta_policy_rule.json';
import rule356 from './okta_attempt_to_modify_okta_application.json';
import rule357 from './persistence_administrator_role_assigned_to_okta_user.json';
import rule358 from './lateral_movement_executable_tool_transfer_smb.json';
import rule359 from './command_and_control_dns_tunneling_nslookup.json';
import rule360 from './lateral_movement_execution_from_tsclient_mup.json';
import rule361 from './lateral_movement_rdp_sharprdp_target.json';
import rule362 from './defense_evasion_clearing_windows_security_logs.json';
import rule363 from './persistence_google_workspace_api_access_granted_via_domain_wide_delegation_of_authority.json';
import rule364 from './execution_suspicious_short_program_name.json';
import rule365 from './lateral_movement_incoming_wmi.json';
import rule366 from './persistence_via_hidden_run_key_valuename.json';
import rule367 from './credential_access_potential_ssh_bruteforce.json';
import rule368 from './credential_access_promt_for_pwd_via_osascript.json';
import rule369 from './lateral_movement_remote_services.json';
import rule370 from './application_added_to_google_workspace_domain.json';
import rule371 from './domain_added_to_google_workspace_trusted_domains.json';
import rule372 from './execution_suspicious_image_load_wmi_ms_office.json';
import rule373 from './execution_suspicious_powershell_imgload.json';
import rule374 from './google_workspace_admin_role_deletion.json';
import rule375 from './google_workspace_mfa_enforcement_disabled.json';
import rule376 from './google_workspace_policy_modified.json';
import rule377 from './mfa_disabled_for_google_workspace_organization.json';
import rule378 from './persistence_evasion_registry_ifeo_injection.json';
import rule379 from './persistence_google_workspace_admin_role_assigned_to_user.json';
import rule380 from './persistence_google_workspace_custom_admin_role_created.json';
import rule381 from './persistence_google_workspace_role_modified.json';
import rule382 from './persistence_suspicious_image_load_scheduled_task_ms_office.json';
import rule383 from './defense_evasion_masquerading_trusted_directory.json';
import rule384 from './exfiltration_microsoft_365_exchange_transport_rule_creation.json';
import rule385 from './initial_access_microsoft_365_exchange_safelinks_disabled.json';
import rule386 from './microsoft_365_exchange_dkim_signing_config_disabled.json';
import rule387 from './persistence_appcertdlls_registry.json';
import rule388 from './persistence_appinitdlls_registry.json';
import rule389 from './persistence_registry_uncommon.json';
import rule390 from './persistence_run_key_and_startup_broad.json';
import rule391 from './persistence_services_registry.json';
import rule392 from './persistence_startup_folder_file_written_by_suspicious_process.json';
import rule393 from './persistence_startup_folder_scripts.json';
import rule394 from './persistence_suspicious_com_hijack_registry.json';
import rule395 from './persistence_via_lsa_security_support_provider_registry.json';
import rule396 from './defense_evasion_microsoft_365_exchange_malware_filter_policy_deletion.json';
import rule397 from './defense_evasion_microsoft_365_exchange_malware_filter_rule_mod.json';
import rule398 from './defense_evasion_microsoft_365_exchange_safe_attach_rule_disabled.json';
import rule399 from './exfiltration_microsoft_365_exchange_transport_rule_mod.json';
import rule400 from './initial_access_microsoft_365_exchange_anti_phish_policy_deletion.json';
import rule401 from './initial_access_microsoft_365_exchange_anti_phish_rule_mod.json';
import rule402 from './lateral_movement_suspicious_rdp_client_imageload.json';
import rule403 from './persistence_runtime_run_key_startup_susp_procs.json';
import rule404 from './persistence_suspicious_scheduled_task_runtime.json';
import rule405 from './defense_evasion_microsoft_365_exchange_dlp_policy_removed.json';
import rule406 from './lateral_movement_scheduled_task_target.json';
import rule407 from './persistence_microsoft_365_exchange_management_role_assignment.json';
import rule408 from './persistence_microsoft_365_teams_guest_access_enabled.json';
import rule409 from './credential_access_dump_registry_hives.json';
import rule410 from './defense_evasion_scheduledjobs_at_protocol_enabled.json';
import rule411 from './persistence_ms_outlook_vba_template.json';
import rule412 from './persistence_suspicious_service_created_registry.json';
import rule413 from './privilege_escalation_named_pipe_impersonation.json';
import rule414 from './credential_access_cmdline_dump_tool.json';
import rule415 from './credential_access_copy_ntds_sam_volshadowcp_cmdline.json';
import rule416 from './credential_access_lsass_memdump_file_created.json';
import rule417 from './lateral_movement_incoming_winrm_shell_execution.json';
import rule418 from './lateral_movement_powershell_remoting_target.json';
import rule419 from './defense_evasion_hide_encoded_executable_registry.json';
import rule420 from './defense_evasion_port_forwarding_added_registry.json';
import rule421 from './lateral_movement_rdp_enabled_registry.json';
import rule422 from './privilege_escalation_printspooler_registry_copyfiles.json';
import rule423 from './privilege_escalation_rogue_windir_environment_var.json';
import rule424 from './initial_access_scripts_process_started_via_wmi.json';
import rule425 from './command_and_control_iexplore_via_com.json';
import rule426 from './command_and_control_remote_file_copy_scripts.json';
import rule427 from './persistence_local_scheduled_task_scripting.json';
import rule428 from './persistence_startup_folder_file_written_by_unsigned_process.json';
import rule429 from './command_and_control_remote_file_copy_powershell.json';
import rule430 from './credential_access_microsoft_365_brute_force_user_account_attempt.json';
import rule431 from './microsoft_365_teams_custom_app_interaction_allowed.json';
import rule432 from './persistence_microsoft_365_teams_external_access_enabled.json';
import rule433 from './credential_access_microsoft_365_potential_password_spraying_attack.json';
import rule434 from './defense_evasion_stop_process_service_threshold.json';
import rule435 from './collection_winrar_encryption.json';
import rule436 from './defense_evasion_unusual_dir_ads.json';
import rule437 from './discovery_admin_recon.json';
import rule438 from './discovery_file_dir_discovery.json';
import rule439 from './discovery_net_view.json';
import rule440 from './discovery_remote_system_discovery_commands_windows.json';
import rule441 from './persistence_via_windows_management_instrumentation_event_subscription.json';
import rule442 from './execution_scripting_osascript_exec_followed_by_netcon.json';
import rule443 from './execution_shell_execution_via_apple_scripting.json';
import rule444 from './persistence_creation_change_launch_agents_file.json';
import rule445 from './persistence_creation_modif_launch_deamon_sequence.json';
import rule446 from './persistence_folder_action_scripts_runtime.json';
import rule447 from './persistence_login_logout_hooks_defaults.json';
import rule448 from './privilege_escalation_explicit_creds_via_scripting.json';
import rule449 from './command_and_control_sunburst_c2_activity_detected.json';
import rule450 from './defense_evasion_azure_application_credential_modification.json';
import rule451 from './defense_evasion_azure_service_principal_addition.json';
import rule452 from './defense_evasion_solarwinds_backdoor_service_disabled_via_registry.json';
import rule453 from './execution_apt_solarwinds_backdoor_child_cmd_powershell.json';
import rule454 from './execution_apt_solarwinds_backdoor_unusual_child_processes.json';
import rule455 from './initial_access_azure_active_directory_powershell_signin.json';
import rule456 from './collection_email_powershell_exchange_mailbox.json';
import rule457 from './collection_persistence_powershell_exch_mailbox_activesync_add_device.json';
import rule458 from './execution_scheduled_task_powershell_source.json';
import rule459 from './persistence_docker_shortcuts_plist_modification.json';
import rule460 from './persistence_evasion_hidden_local_account_creation.json';
import rule461 from './persistence_finder_sync_plugin_pluginkit.json';
import rule462 from './discovery_security_software_grep.json';
import rule463 from './credential_access_cookies_chromium_browsers_debugging.json';
import rule464 from './credential_access_ssh_backdoor_log.json';
import rule465 from './persistence_credential_access_modify_auth_module_or_config.json';
import rule466 from './persistence_credential_access_modify_ssh_binaries.json';
import rule467 from './credential_access_collection_sensitive_files.json';
import rule468 from './persistence_ssh_authorized_keys_modification.json';
import rule469 from './defense_evasion_defender_disabled_via_registry.json';
import rule470 from './defense_evasion_privacy_controls_tcc_database_modification.json';
import rule471 from './execution_initial_access_suspicious_browser_childproc.json';
import rule472 from './execution_script_via_automator_workflows.json';
import rule473 from './persistence_modification_sublime_app_plugin_or_script.json';
import rule474 from './privilege_escalation_applescript_with_admin_privs.json';
import rule475 from './credential_access_dumping_keychain_security.json';
import rule476 from './initial_access_azure_active_directory_high_risk_signin.json';
import rule477 from './initial_access_suspicious_mac_ms_office_child_process.json';
import rule478 from './credential_access_mitm_localhost_webproxy.json';
import rule479 from './persistence_kde_autostart_modification.json';
import rule480 from './persistence_user_account_added_to_privileged_group_ad.json';
import rule481 from './defense_evasion_attempt_to_disable_gatekeeper.json';
import rule482 from './defense_evasion_sandboxed_office_app_suspicious_zip_file.json';
import rule483 from './persistence_emond_rules_file_creation.json';
import rule484 from './persistence_emond_rules_process_execution.json';
import rule485 from './discovery_users_domain_built_in_commands.json';
import rule486 from './execution_pentest_eggshell_remote_admin_tool.json';
import rule487 from './defense_evasion_install_root_certificate.json';
import rule488 from './persistence_credential_access_authorization_plugin_creation.json';
import rule489 from './persistence_directory_services_plugins_modification.json';
import rule490 from './defense_evasion_modify_environment_launchctl.json';
import rule491 from './defense_evasion_safari_config_change.json';
import rule492 from './defense_evasion_apple_softupdates_modification.json';
import rule493 from './credential_access_mod_wdigest_security_provider.json';
import rule494 from './credential_access_saved_creds_vaultcmd.json';
import rule495 from './defense_evasion_file_creation_mult_extension.json';
import rule496 from './execution_enumeration_via_wmiprvse.json';
import rule497 from './execution_suspicious_jar_child_process.json';
import rule498 from './persistence_shell_profile_modification.json';
import rule499 from './persistence_suspicious_calendar_modification.json';
import rule500 from './persistence_time_provider_mod.json';
import rule501 from './privilege_escalation_exploit_adobe_acrobat_updater.json';
import rule502 from './defense_evasion_sip_provider_mod.json';
import rule503 from './execution_com_object_xwizard.json';
import rule504 from './privilege_escalation_disable_uac_registry.json';
import rule505 from './defense_evasion_unusual_ads_file_creation.json';
import rule506 from './persistence_loginwindow_plist_modification.json';
import rule507 from './persistence_periodic_tasks_file_mdofiy.json';
import rule508 from './persistence_via_atom_init_file_modification.json';
import rule509 from './privilege_escalation_lsa_auth_package.json';
import rule510 from './privilege_escalation_port_monitor_print_pocessor_abuse.json';
import rule511 from './credential_access_dumping_hashes_bi_cmds.json';
import rule512 from './lateral_movement_mounting_smb_share.json';
import rule513 from './privilege_escalation_echo_nopasswd_sudoers.json';
import rule514 from './privilege_escalation_ld_preload_shared_object_modif.json';
import rule515 from './privilege_escalation_root_crontab_filemod.json';
import rule516 from './defense_evasion_create_mod_root_certificate.json';
import rule517 from './privilege_escalation_sudo_buffer_overflow.json';
import rule518 from './execution_installer_spawned_network_event.json';
import rule519 from './initial_access_suspicious_ms_exchange_files.json';
import rule520 from './initial_access_suspicious_ms_exchange_process.json';
import rule521 from './initial_access_suspicious_ms_exchange_worker_child_process.json';
import rule522 from './persistence_evasion_registry_startup_shell_folder_modified.json';
import rule523 from './persistence_local_scheduled_job_creation.json';
import rule524 from './persistence_via_wmi_stdregprov_run_services.json';
import rule525 from './credential_access_persistence_network_logon_provider_modification.json';
import rule526 from './lateral_movement_defense_evasion_lanman_nullsessionpipe_modification.json';
import rule527 from './collection_microsoft_365_new_inbox_rule.json';
import rule528 from './ml_high_count_network_denies.json';
import rule529 from './ml_high_count_network_events.json';
import rule530 from './ml_rare_destination_country.json';
import rule531 from './ml_spike_in_traffic_to_a_country.json';
import rule532 from './command_and_control_tunneling_via_earthworm.json';
import rule533 from './lateral_movement_evasion_rdp_shadowing.json';
import rule534 from './threat_intel_module_match.json';
import rule535 from './exfiltration_ec2_vm_export_failure.json';
import rule536 from './exfiltration_ec2_full_network_packet_capture_detected.json';
import rule537 from './impact_azure_service_principal_credentials_added.json';
import rule538 from './persistence_ec2_security_group_configuration_change_detection.json';
import rule539 from './defense_evasion_disabling_windows_logs.json';
import rule540 from './persistence_route_53_domain_transfer_lock_disabled.json';
import rule541 from './persistence_route_53_domain_transferred_to_another_account.json';
import rule542 from './credential_access_user_excessive_sso_logon_errors.json';
import rule543 from './defense_evasion_suspicious_execution_from_mounted_device.json';
import rule544 from './defense_evasion_unusual_network_connection_via_dllhost.json';
import rule545 from './defense_evasion_amsienable_key_mod.json';
import rule546 from './impact_rds_group_deletion.json';
import rule547 from './persistence_rds_group_creation.json';
import rule548 from './exfiltration_rds_snapshot_export.json';
import rule549 from './persistence_rds_instance_creation.json';
import rule550 from './ml_auth_rare_hour_for_a_user_to_logon.json';
import rule551 from './ml_auth_rare_source_ip_for_a_user.json';
import rule552 from './ml_auth_rare_user_logon.json';
import rule553 from './ml_auth_spike_in_failed_logon_events.json';
import rule554 from './ml_auth_spike_in_logon_events.json';
import rule555 from './ml_auth_spike_in_logon_events_from_a_source_ip.json';
import rule556 from './privilege_escalation_cyberarkpas_error_audit_event_promotion.json';
import rule557 from './privilege_escalation_cyberarkpas_recommended_events_to_monitor_promotion.json';
import rule558 from './privilege_escalation_printspooler_malicious_driver_file_changes.json';
import rule559 from './privilege_escalation_printspooler_malicious_registry_modification.json';
import rule560 from './privilege_escalation_printspooler_suspicious_file_deletion.json';
import rule561 from './privilege_escalation_unusual_printspooler_childprocess.json';
import rule562 from './defense_evasion_disabling_windows_defender_powershell.json';
import rule563 from './defense_evasion_enable_network_discovery_with_netsh.json';
import rule564 from './defense_evasion_execution_windefend_unusual_path.json';
import rule565 from './defense_evasion_agent_spoofing_mismatched_id.json';
import rule566 from './defense_evasion_agent_spoofing_multiple_hosts.json';
import rule567 from './defense_evasion_parent_process_pid_spoofing.json';
import rule568 from './defense_evasion_defender_exclusion_via_powershell.json';
import rule569 from './defense_evasion_whitespace_padding_in_command_line.json';
import rule570 from './persistence_webshell_detection.json';
import rule571 from './persistence_via_bits_job_notify_command.json';

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
  rule202,
  rule203,
  rule204,
  rule205,
  rule206,
  rule207,
  rule208,
  rule209,
  rule210,
  rule211,
  rule212,
  rule213,
  rule214,
  rule215,
  rule216,
  rule217,
  rule218,
  rule219,
  rule220,
  rule221,
  rule222,
  rule223,
  rule224,
  rule225,
  rule226,
  rule227,
  rule228,
  rule229,
  rule230,
  rule231,
  rule232,
  rule233,
  rule234,
  rule235,
  rule236,
  rule237,
  rule238,
  rule239,
  rule240,
  rule241,
  rule242,
  rule243,
  rule244,
  rule245,
  rule246,
  rule247,
  rule248,
  rule249,
  rule250,
  rule251,
  rule252,
  rule253,
  rule254,
  rule255,
  rule256,
  rule257,
  rule258,
  rule259,
  rule260,
  rule261,
  rule262,
  rule263,
  rule264,
  rule265,
  rule266,
  rule267,
  rule268,
  rule269,
  rule270,
  rule271,
  rule272,
  rule273,
  rule274,
  rule275,
  rule276,
  rule277,
  rule278,
  rule279,
  rule280,
  rule281,
  rule282,
  rule283,
  rule284,
  rule285,
  rule286,
  rule287,
  rule288,
  rule289,
  rule290,
  rule291,
  rule292,
  rule293,
  rule294,
  rule295,
  rule296,
  rule297,
  rule298,
  rule299,
  rule300,
  rule301,
  rule302,
  rule303,
  rule304,
  rule305,
  rule306,
  rule307,
  rule308,
  rule309,
  rule310,
  rule311,
  rule312,
  rule313,
  rule314,
  rule315,
  rule316,
  rule317,
  rule318,
  rule319,
  rule320,
  rule321,
  rule322,
  rule323,
  rule324,
  rule325,
  rule326,
  rule327,
  rule328,
  rule329,
  rule330,
  rule331,
  rule332,
  rule333,
  rule334,
  rule335,
  rule336,
  rule337,
  rule338,
  rule339,
  rule340,
  rule341,
  rule342,
  rule343,
  rule344,
  rule345,
  rule346,
  rule347,
  rule348,
  rule349,
  rule350,
  rule351,
  rule352,
  rule353,
  rule354,
  rule355,
  rule356,
  rule357,
  rule358,
  rule359,
  rule360,
  rule361,
  rule362,
  rule363,
  rule364,
  rule365,
  rule366,
  rule367,
  rule368,
  rule369,
  rule370,
  rule371,
  rule372,
  rule373,
  rule374,
  rule375,
  rule376,
  rule377,
  rule378,
  rule379,
  rule380,
  rule381,
  rule382,
  rule383,
  rule384,
  rule385,
  rule386,
  rule387,
  rule388,
  rule389,
  rule390,
  rule391,
  rule392,
  rule393,
  rule394,
  rule395,
  rule396,
  rule397,
  rule398,
  rule399,
  rule400,
  rule401,
  rule402,
  rule403,
  rule404,
  rule405,
  rule406,
  rule407,
  rule408,
  rule409,
  rule410,
  rule411,
  rule412,
  rule413,
  rule414,
  rule415,
  rule416,
  rule417,
  rule418,
  rule419,
  rule420,
  rule421,
  rule422,
  rule423,
  rule424,
  rule425,
  rule426,
  rule427,
  rule428,
  rule429,
  rule430,
  rule431,
  rule432,
  rule433,
  rule434,
  rule435,
  rule436,
  rule437,
  rule438,
  rule439,
  rule440,
  rule441,
  rule442,
  rule443,
  rule444,
  rule445,
  rule446,
  rule447,
  rule448,
  rule449,
  rule450,
  rule451,
  rule452,
  rule453,
  rule454,
  rule455,
  rule456,
  rule457,
  rule458,
  rule459,
  rule460,
  rule461,
  rule462,
  rule463,
  rule464,
  rule465,
  rule466,
  rule467,
  rule468,
  rule469,
  rule470,
  rule471,
  rule472,
  rule473,
  rule474,
  rule475,
  rule476,
  rule477,
  rule478,
  rule479,
  rule480,
  rule481,
  rule482,
  rule483,
  rule484,
  rule485,
  rule486,
  rule487,
  rule488,
  rule489,
  rule490,
  rule491,
  rule492,
  rule493,
  rule494,
  rule495,
  rule496,
  rule497,
  rule498,
  rule499,
  rule500,
  rule501,
  rule502,
  rule503,
  rule504,
  rule505,
  rule506,
  rule507,
  rule508,
  rule509,
  rule510,
  rule511,
  rule512,
  rule513,
  rule514,
  rule515,
  rule516,
  rule517,
  rule518,
  rule519,
  rule520,
  rule521,
  rule522,
  rule523,
  rule524,
  rule525,
  rule526,
  rule527,
  rule528,
  rule529,
  rule530,
  rule531,
  rule532,
  rule533,
  rule534,
  rule535,
  rule536,
  rule537,
  rule538,
  rule539,
  rule540,
  rule541,
  rule542,
  rule543,
  rule544,
  rule545,
  rule546,
  rule547,
  rule548,
  rule549,
  rule550,
  rule551,
  rule552,
  rule553,
  rule554,
  rule555,
  rule556,
  rule557,
  rule558,
  rule559,
  rule560,
  rule561,
  rule562,
  rule563,
  rule564,
  rule565,
  rule566,
  rule567,
  rule568,
  rule569,
  rule570,
  rule571,
];
