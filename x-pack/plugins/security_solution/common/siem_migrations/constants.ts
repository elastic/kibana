/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SIEM_MIGRATIONS_PATH = '/internal/siem_migrations' as const;
export const SIEM_RULE_MIGRATIONS_PATH = `${SIEM_MIGRATIONS_PATH}/rules` as const;

export const SIEM_RULE_MIGRATIONS_ALL_STATS_PATH = `${SIEM_RULE_MIGRATIONS_PATH}/stats` as const;
export const SIEM_RULE_MIGRATION_PATH = `${SIEM_RULE_MIGRATIONS_PATH}/{migration_id}` as const;
export const SIEM_RULE_MIGRATION_START_PATH = `${SIEM_RULE_MIGRATION_PATH}/start` as const;
export const SIEM_RULE_MIGRATION_RETRY_PATH = `${SIEM_RULE_MIGRATION_PATH}/retry` as const;
export const SIEM_RULE_MIGRATION_STATS_PATH = `${SIEM_RULE_MIGRATION_PATH}/stats` as const;
export const SIEM_RULE_MIGRATION_STOP_PATH = `${SIEM_RULE_MIGRATION_PATH}/stop` as const;

export const SIEM_RULE_MIGRATION_RESOURCES_PATH = `${SIEM_RULE_MIGRATION_PATH}/resources` as const;

export const SIEM_RULE_MIGRATION_CIM_ECS_MAP = `
datamodel,object,source_field,ecs_field,data_type
Application_State,All_Application_State,dest,service.node.name,string
Application_State,All_Application_State,process,process.title,string
Application_State,All_Application_State,user,user.name,string
Application_State,Ports,dest_port,destination.port,number
Application_State,Ports,transport,network.transport,string
Application_State,Ports,transport_dest_port,destination.port,string
Application_State,Services,service,service.name,string
Application_State,Services,service_id,service.id,string
Application_State,Services,status,service.state,string
Authentication,Authentication,action,event.action,string
Authentication,Authentication,app,process.name,string
Authentication,Authentication,dest,host.name,string
Authentication,Authentication,duration,event.duration,number
Authentication,Authentication,signature,event.code,string
Authentication,Authentication,signature_id,event.reason,string
Authentication,Authentication,src,source.address,string
Authentication,Authentication,src_nt_domain,source.domain,string
Authentication,Authentication,user,user.name,string
Certificates,All_Certificates,dest_port,destination.port,number
Certificates,All_Certificates,duration,event.duration,number
Certificates,All_Certificates,src,source.address,string
Certificates,All_Certificates,src_port,source.port,number
Certificates,All_Certificates,transport,network.protocol,string
Certificates,SSL,ssl_end_time,tls.server.not_after,time
Certificates,SSL,ssl_hash,tls.server.hash,string
Certificates,SSL,ssl_issuer_common_name,tls.server.issuer,string
Certificates,SSL,ssl_issuer_locality,x509.issuer.locality,string
Certificates,SSL,ssl_issuer_organization,x509.issuer.organization,string
Certificates,SSL,ssl_issuer_state,x509.issuer.state_or_province,string
Certificates,SSL,ssl_issuer_unit,x509.issuer.organizational_unit,string
Certificates,SSL,ssl_publickey_algorithm,x509.public_key_algorithm,string
Certificates,SSL,ssl_serial,x509.serial_number,string
Certificates,SSL,ssl_signature_algorithm,x509.signature_algorithm,string
Certificates,SSL,ssl_start_time,x509.not_before,time
Certificates,SSL,ssl_subject,x509.subject.distinguished_name,string
Certificates,SSL,ssl_subject_common_name,x509.subject.common_name,string
Certificates,SSL,ssl_subject_locality,x509.subject.locality,string
Certificates,SSL,ssl_subject_organization,x509.subject.organization,string
Certificates,SSL,ssl_subject_state,x509.subject.state_or_province,string
Certificates,SSL,ssl_subject_unit,x509.subject.organizational_unit,string
Certificates,SSL,ssl_version,tls.version,string
Change,All_Changes,action,event.action,string
Change,Account_Management,dest_nt_domain,destination.domain,string
Change,Account_Management,src_nt_domain,source.domain,string
Change,Account_Management,src_user,source.user,string
Intrusion_Detection,IDS_Attacks,action,event.action,string
Intrusion_Detection,IDS_Attacks,dest,destination.address,string
Intrusion_Detection,IDS_Attacks,dest_port,destination.port,number
Intrusion_Detection,IDS_Attacks,dvc,observer.hostname,string
Intrusion_Detection,IDS_Attacks,severity,event.severity,string
Intrusion_Detection,IDS_Attacks,src,source.ip,string
Intrusion_Detection,IDS_Attacks,user,source.user,string
JVM,OS,os,host.os.name,string
JVM,OS,os_architecture,host.architecture,string
JVM,OS,os_version,host.os.version,string
Malware,Malware_Attacks,action,event.action,string
Malware,Malware_Attacks,date,event.created,string
Malware,Malware_Attacks,dest,host.hostname,string
Malware,Malware_Attacks,file_hash,file.hash.*,string
Malware,Malware_Attacks,file_name,file.name,string
Malware,Malware_Attacks,file_path,file.path,string
Malware,Malware_Attacks,Sender,source.user.email,string
Malware,Malware_Attacks,src,source.ip,string
Malware,Malware_Attacks,user,related.user,string
Malware,Malware_Attacks,url,rule.reference,string
Network_Resolution,DNS,answer,dns.answers,string
Network_Resolution,DNS,dest,destination.address,string
Network_Resolution,DNS,dest_port,destination.port,number
Network_Resolution,DNS,duration,event.duration,number
Network_Resolution,DNS,message_type,dns.type,string
Network_Resolution,DNS,name,dns.question.name,string
Network_Resolution,DNS,query,dns.question.name,string
Network_Resolution,DNS,query_type,dns.op_code,string
Network_Resolution,DNS,record_type,dns.question.type,string
Network_Resolution,DNS,reply_code,dns.response_code,string
Network_Resolution,DNS,reply_code_id,dns.id,number
Network_Resolution,DNS,response_time,event.duration,number
Network_Resolution,DNS,src,source.address,string
Network_Resolution,DNS,src_port,source.port,number
Network_Resolution,DNS,transaction_id,dns.id,number
Network_Resolution,DNS,transport,network.transport,string
Network_Resolution,DNS,ttl,dns.answers.ttl,number
Network_Sessions,All_Sessions,action,event.action,string
Network_Sessions,All_Sessions,dest_ip,destination.ip,string
Network_Sessions,All_Sessions,dest_mac,destination.mac,string
Network_Sessions,All_Sessions,duration,event.duration,number
Network_Sessions,All_Sessions,src_dns,source.registered_domain,string
Network_Sessions,All_Sessions,src_ip,source.ip,string
Network_Sessions,All_Sessions,src_mac,source.mac,string
Network_Sessions,All_Sessions,user,user.name,string
Network_Traffic,All_Traffic,action,event.action,string
Network_Traffic,All_Traffic,app,network.protocol,string
Network_Traffic,All_Traffic,bytes,network.bytes,number
Network_Traffic,All_Traffic,dest,destination.ip,string
Network_Traffic,All_Traffic,dest_ip,destination.ip,string
Network_Traffic,All_Traffic,dest_mac,destination.mac,string
Network_Traffic,All_Traffic,dest_port,destination.port,number
Network_Traffic,All_Traffic,dest_translated_ip,destination.nat.ip,string
Network_Traffic,All_Traffic,dest_translated_port,destination.nat.port,number
Network_Traffic,All_Traffic,direction,network.direction,string
Network_Traffic,All_Traffic,duration,event.duration,number
Network_Traffic,All_Traffic,dvc,observer.name,string
Network_Traffic,All_Traffic,dvc_ip,observer.ip,string
Network_Traffic,All_Traffic,dvc_mac,observer.mac,string
Network_Traffic,All_Traffic,dvc_zone,observer.egress.zone,string
Network_Traffic,All_Traffic,packets,network.packets,number
Network_Traffic,All_Traffic,packets_in,source.packets,number
Network_Traffic,All_Traffic,packets_out,destination.packets,number
Network_Traffic,All_Traffic,protocol,network.protocol,string
Network_Traffic,All_Traffic,rule,rule.name,string
Network_Traffic,All_Traffic,src,source.address,string
Network_Traffic,All_Traffic,src_ip,source.ip,string
Network_Traffic,All_Traffic,src_mac,source.mac,string
Network_Traffic,All_Traffic,src_port,source.port,number
Network_Traffic,All_Traffic,src_translated_ip,source.nat.ip,string
Network_Traffic,All_Traffic,src_translated_port,source.nat.port,number
Network_Traffic,All_Traffic,transport,network.transport,string
Network_Traffic,All_Traffic,vlan,vlan.name,string
Vulnerabilities,Vulnerabilities,category,vulnerability.category,string
Vulnerabilities,Vulnerabilities,cve,vulnerability.id,string
Vulnerabilities,Vulnerabilities,cvss,vulnerability.score.base,number
Vulnerabilities,Vulnerabilities,dest,host.name,string
Vulnerabilities,Vulnerabilities,dvc,vulnerability.scanner.vendor,string
Vulnerabilities,Vulnerabilities,severity,vulnerability.severity,string
Vulnerabilities,Vulnerabilities,url,vulnerability.reference,string
Vulnerabilities,Vulnerabilities,user,related.user,string
Vulnerabilities,Vulnerabilities,vendor_product,vulnerability.scanner.vendor,string
Endpoint,Ports,creation_time,@timestamp,timestamp
Endpoint,Ports,dest_port,destination.port,number
Endpoint,Ports,process_id,process.pid,string
Endpoint,Ports,transport,network.transport,string
Endpoint,Ports,transport_dest_port,destination.port,string
Endpoint,Processes,action,event.action,string
Endpoint,Processes,os,os.full,string
Endpoint,Processes,parent_process_exec,process.parent.name,string
Endpoint,Processes,parent_process_id,process.ppid,number
Endpoint,Processes,parent_process_guid,process.parent.entity_id,string
Endpoint,Processes,parent_process_path,process.parent.executable,string
Endpoint,Processes,process_current_directory,process.parent.working_directory,
Endpoint,Processes,process_exec,process.name,string
Endpoint,Processes,process_hash,process.hash.*,string
Endpoint,Processes,process_guid,process.entity_id,string
Endpoint,Processes,process_id,process.pid,number
Endpoint,Processes,process_path,process.executable,string
Endpoint,Processes,user_id,related.user,string
Endpoint,Services,description,service.name,string
Endpoint,Services,process_id,service.id,string
Endpoint,Services,service_dll,dll.name,string
Endpoint,Services,service_dll_path,dll.path,string
Endpoint,Services,service_dll_hash,dll.hash.*,string
Endpoint,Services,service_dll_signature_exists,dll.code_signature.exists,boolean
Endpoint,Services,service_dll_signature_verified,dll.code_signature.valid,boolean
Endpoint,Services,service_exec,service.name,string
Endpoint,Services,service_hash,hash.*,string
Endpoint,Filesystem,file_access_time,file.accessed,timestamp
Endpoint,Filesystem,file_create_time,file.created,timestamp
Endpoint,Filesystem,file_modify_time,file.mtime,timestamp
Endpoint,Filesystem,process_id,process.pid,string
Endpoint,Registry,process_id,process.id,string
Web,Web,action,event.action,string
Web,Web,app,observer.product,string
Web,Web,bytes_in,http.request.bytes,number
Web,Web,bytes_out,http.response.bytes,number
Web,Web,dest,destination.ip,string
Web,Web,duration,event.duration,number
Web,Web,http_method,http.request.method,string
Web,Web,http_referrer,http.request.referrer,string
Web,Web,http_user_agent,user_agent.name,string
Web,Web,status,http.response.status_code,string
Web,Web,url,url.full,string
Web,Web,user,url.username,string
Web,Web,vendor_product,observer.product,string`;

export enum SiemMigrationTaskStatus {
  READY = 'ready',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FINISHED = 'finished',
}

export enum SiemMigrationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum SiemMigrationRuleTranslationResult {
  FULL = 'full',
  PARTIAL = 'partial',
  UNTRANSLATABLE = 'untranslatable',
}
