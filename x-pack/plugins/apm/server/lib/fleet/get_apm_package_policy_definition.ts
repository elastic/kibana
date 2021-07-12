/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMPluginSetupDependencies } from '../../types';
import {
  POLICY_ELASTIC_AGENT_ON_CLOUD,
  APM_PACKAGE_NAME,
} from './get_cloud_apm_package_policy';

interface GetApmPackagePolicyDefinitionOptions {
  apmServerSchema: Record<string, any>;
  cloudPluginSetup: APMPluginSetupDependencies['cloud'];
}
export function getApmPackagePolicyDefinition(
  options: GetApmPackagePolicyDefinitionOptions
) {
  return {
    name: 'Elastic APM',
    namespace: 'default',
    enabled: true,
    policy_id: POLICY_ELASTIC_AGENT_ON_CLOUD,
    output_id: '',
    inputs: [
      {
        type: 'apm',
        enabled: true,
        streams: [],
        vars: getApmPackageInputVars(options),
      },
    ],
    package: {
      name: APM_PACKAGE_NAME,
      version: '0.3.0',
      title: 'Elastic APM',
    },
  };
}

function getApmPackageInputVars(options: GetApmPackagePolicyDefinitionOptions) {
  const { apmServerSchema } = options;
  const apmServerConfigs = Object.entries(
    apmConfigMapping
  ).map(([key, { name, type, getValue }]) => ({ key, name, type, getValue }));

  const inputVars: Record<
    string,
    { type: string; value: any }
  > = apmServerConfigs.reduce((acc, { key, name, type, getValue }) => {
    const value = (getValue ? getValue(options) : apmServerSchema[key]) ?? ''; // defaults to an empty string to be edited in Fleet UI
    return {
      ...acc,
      [name]: { type, value },
    };
  }, {});
  return inputVars;
}

export const apmConfigMapping: Record<
  string,
  {
    name: string;
    type: string;
    getValue?: (options: GetApmPackagePolicyDefinitionOptions) => any;
  }
> = {
  'apm-server.host': {
    name: 'host',
    type: 'text',
  },
  'apm-server.url': {
    name: 'url',
    type: 'text',
    getValue: ({ cloudPluginSetup }) => cloudPluginSetup?.apm?.url,
  },
  'apm-server.secret_token': {
    name: 'secret_token',
    type: 'text',
  },
  'apm-server.api_key.enabled': {
    name: 'api_key_enabled',
    type: 'bool',
  },
  'apm-server.rum.enabled': {
    name: 'enable_rum',
    type: 'bool',
  },
  'apm-server.default_service_environment': {
    name: 'default_service_environment',
    type: 'text',
  },
  'apm-server.rum.allow_service_names': {
    name: 'rum_allow_service_names',
    type: 'text',
  },
  'apm-server.rum.allow_origins': {
    name: 'rum_allow_origins',
    type: 'text',
  },
  'apm-server.rum.allow_headers': {
    name: 'rum_allow_headers',
    type: 'text',
  },
  'apm-server.rum.response_headers': {
    name: 'rum_response_headers',
    type: 'yaml',
  },
  'apm-server.rum.event_rate.limit': {
    name: 'rum_event_rate_limit',
    type: 'integer',
  },
  'apm-server.rum.event_rate.lru_size': {
    name: 'rum_event_rate_lru_size',
    type: 'integer',
  },
  'apm-server.api_key.limit': {
    name: 'api_key_limit',
    type: 'integer',
  },
  'apm-server.max_event_size': {
    name: 'max_event_bytes',
    type: 'integer',
  },
  'apm-server.capture_personal_data': {
    name: 'capture_personal_data',
    type: 'bool',
  },
  'apm-server.max_header_size': {
    name: 'max_header_bytes',
    type: 'integer',
  },
  'apm-server.idle_timeout': {
    name: 'idle_timeout',
    type: 'text',
  },
  'apm-server.read_timeout': {
    name: 'read_timeout',
    type: 'text',
  },
  'apm-server.shutdown_timeout': {
    name: 'shutdown_timeout',
    type: 'text',
  },
  'apm-server.write_timeout': {
    name: 'write_timeout',
    type: 'text',
  },
  'apm-server.max_connections': {
    name: 'max_connections',
    type: 'integer',
  },
  'apm-server.response_headers': {
    name: 'response_headers',
    type: 'yaml',
  },
  'apm-server.expvar.enabled': {
    name: 'expvar_enabled',
    type: 'bool',
  },
  'apm-server.ssl.enabled': {
    name: 'tls_enabled',
    type: 'bool',
  },
  'apm-server.ssl.certificate': {
    name: 'tls_certificate',
    type: 'text',
  },
  'apm-server.ssl.key': {
    name: 'tls_key',
    type: 'text',
  },
  'apm-server.ssl.supported_protocols': {
    name: 'tls_supported_protocols',
    type: 'text',
  },
  'apm-server.ssl.cipher_suites': {
    name: 'tls_cipher_suites',
    type: 'text',
  },
  'apm-server.ssl.curve_types': {
    name: 'tls_curve_types',
    type: 'text',
  },
};
