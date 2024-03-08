/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_POLICY_SAVED_OBJECT_TYPE = 'ingest-agent-policies';
export const AGENT_POLICY_INDEX = '.fleet-policies';
export const agentPolicyStatuses = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export const AGENT_POLICY_DEFAULT_MONITORING_DATASETS = [
  'elastic_agent',
  'elastic_agent.elastic_agent',
  'elastic_agent.apm_server',
  'elastic_agent.filebeat',
  'elastic_agent.filebeat_input',
  'elastic_agent.fleet_server',
  'elastic_agent.metricbeat',
  'elastic_agent.osquerybeat',
  'elastic_agent.packetbeat',
  'elastic_agent.endpoint_security',
  'elastic_agent.auditbeat',
  'elastic_agent.heartbeat',
  'elastic_agent.cloudbeat',
  'elastic_agent.cloud_defend',
  'elastic_agent.pf_host_agent',
  'elastic_agent.pf_elastic_collector',
  'elastic_agent.pf_elastic_symbolizer',
];

export const LICENSE_FOR_SCHEDULE_UPGRADE = 'platinum';

export const DEFAULT_MAX_AGENT_POLICIES_WITH_INACTIVITY_TIMEOUT = 750;

export const AGENTLESS_POLICY_ID = 'agentless'; // the policy id defined here: https://github.com/elastic/project-controller/blob/main/internal/project/security/security_kibana_config.go#L86
