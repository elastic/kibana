/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const POLICY_ELASTIC_AGENT_ON_CLOUD = 'policy-elastic-agent-on-cloud';

export const INPUT_VAR_NAME_TO_SCHEMA_PATH: Record<string, string> = {
  host: 'apm-server.host',
  url: 'apm-server.url',
  enable_rum: 'apm-server.rum.enabled',
  default_service_environment: 'apm-server.default_service_environment',
  rum_allow_origins: 'apm-server.rum.allow_origins',
  rum_allow_headers: 'apm-server.rum.allow_headers',
  rum_event_rate_limit: 'apm-server.rum.event_rate.limit',
  rum_allow_service_names: 'apm-server.rum.allow_service_names',
  rum_event_rate_lru_size: 'apm-server.rum.event_rate.lru_size',
  rum_response_headers: 'apm-server.rum.response_headers',
  rum_library_pattern: 'apm-server.rum.library_pattern',
  rum_exclude_from_grouping: 'apm-server.rum.exclude_from_grouping',
  max_event_bytes: 'apm-server.max_event_size',
  capture_personal_data: 'apm-server.capture_personal_data',
  max_header_bytes: 'apm-server.max_header_size',
  idle_timeout: 'apm-server.idle_timeout',
  read_timeout: 'apm-server.read_timeout',
  shutdown_timeout: 'apm-server.shutdown_timeout',
  write_timeout: 'apm-server.write_timeout',
  max_connections: 'apm-server.max_connections',
  response_headers: 'apm-server.response_headers',
  expvar_enabled: 'apm-server.expvar.enabled',
  tls_enabled: 'apm-server.ssl.enabled',
  tls_certificate: 'apm-server.ssl.certificate',
  tls_key: 'apm-server.ssl.key',
  tls_supported_protocols: 'apm-server.ssl.supported_protocols',
  tls_cipher_suites: 'apm-server.ssl.cipher_suites',
  tls_curve_types: 'apm-server.ssl.curve_types',
  secret_token: 'apm-server.auth.secret_token',
  api_key_enabled: 'apm-server.auth.api_key.enabled',
  api_key_limit: 'apm-server.auth.api_key.limit',
  anonymous_enabled: 'apm-server.auth.anonymous.enabled',
  anonymous_allow_agent: 'apm-server.auth.anonymous.allow_agent',
  anonymous_allow_service: 'apm-server.auth.anonymous.allow_service',
  anonymous_rate_limit_ip_limit:
    'apm-server.auth.anonymous.rate_limit.ip_limit',
  anonymous_rate_limit_event_limit:
    'apm-server.auth.anonymous.rate_limit.event_limit',
  tail_sampling_enabled: 'apm-server.sampling.tail.enabled',
  tail_sampling_interval: 'apm-server.sampling.tail.interval',
  tail_sampling_policies: 'apm-server.sampling.tail.policies',
};

export const LEGACY_TO_CURRENT_SCHEMA_PATHS: Record<string, string> = {
  'apm-server.rum.event_rate.limit':
    'apm-server.auth.anonymous.rate_limit.event_limit',
  'apm-server.rum.event_rate.lru_size':
    'apm-server.auth.anonymous.rate_limit.ip_limit',
  'apm-server.rum.allow_service_names':
    'apm-server.auth.anonymous.allow_service',
  'apm-server.secret_token': 'apm-server.auth.secret_token',
  'apm-server.api_key.enabled': 'apm-server.auth.api_key.enabled',
};

export const ELASTIC_CLOUD_APM_AGENT_POLICY_ID = 'elastic-cloud-apm';
