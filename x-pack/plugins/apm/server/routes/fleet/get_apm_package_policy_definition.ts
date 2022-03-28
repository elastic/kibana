/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPrereleaseVersion,
  POLICY_ELASTIC_AGENT_ON_CLOUD,
  SUPPORTED_APM_PACKAGE_VERSION,
  ELASTIC_CLOUD_APM_AGENT_POLICY_ID,
} from '../../../common/fleet';
import {
  APMPluginSetupDependencies,
  APMPluginStartDependencies,
} from '../../types';
import { APM_PACKAGE_NAME } from './get_cloud_apm_package_policy';

interface GetApmPackagePolicyDefinitionOptions {
  apmServerSchema: Record<string, any>;
  cloudPluginSetup: APMPluginSetupDependencies['cloud'];
  fleetPluginStart: APMPluginStartDependencies['fleet'];
  kibanaVersion: string;
}
export async function getApmPackagePolicyDefinition(
  options: GetApmPackagePolicyDefinitionOptions
) {
  const { apmServerSchema, cloudPluginSetup, fleetPluginStart, kibanaVersion } =
    options;

  return {
    id: ELASTIC_CLOUD_APM_AGENT_POLICY_ID,
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
        vars: getApmPackageInputVars({
          cloudPluginSetup,
          fleetPluginStart,
          apmServerSchema: preprocessLegacyFields({ apmServerSchema }),
          kibanaVersion,
        }),
      },
    ],
    package: {
      name: APM_PACKAGE_NAME,
      version: await getApmPackageVersion(fleetPluginStart, kibanaVersion),
      title: 'Elastic APM',
    },
  };
}

async function getApmPackageVersion(
  fleetPluginStart: APMPluginStartDependencies['fleet'],
  kibanaVersion: string
) {
  if (fleetPluginStart && isPrereleaseVersion(kibanaVersion)) {
    try {
      const latestApmPackage =
        await fleetPluginStart.packageService.asInternalUser.fetchFindLatestPackage(
          'apm'
        );
      return latestApmPackage.version;
    } catch (error) {
      return SUPPORTED_APM_PACKAGE_VERSION;
    }
  }
  return SUPPORTED_APM_PACKAGE_VERSION;
}

export function preprocessLegacyFields({
  apmServerSchema,
}: {
  apmServerSchema: Record<string, any>;
}) {
  const copyOfApmServerSchema = { ...apmServerSchema };
  [
    {
      key: 'apm-server.auth.anonymous.rate_limit.event_limit',
      legacyKey: 'apm-server.rum.event_rate.limit',
    },
    {
      key: 'apm-server.auth.anonymous.rate_limit.ip_limit',
      legacyKey: 'apm-server.rum.event_rate.lru_size',
    },
    {
      key: 'apm-server.auth.anonymous.allow_service',
      legacyKey: 'apm-server.rum.allow_service_names',
    },
    {
      key: 'apm-server.auth.secret_token',
      legacyKey: 'apm-server.secret_token',
    },
    {
      key: 'apm-server.auth.api_key.enabled',
      legacyKey: 'apm-server.api_key.enabled',
    },
  ].forEach(({ key, legacyKey }) => {
    if (!copyOfApmServerSchema[key]) {
      copyOfApmServerSchema[key] = copyOfApmServerSchema[legacyKey];
      delete copyOfApmServerSchema[legacyKey];
    }
  });
  return copyOfApmServerSchema;
}

function getApmPackageInputVars(options: GetApmPackagePolicyDefinitionOptions) {
  const { apmServerSchema } = options;
  const apmServerConfigs = Object.entries(apmConfigMapping).map(
    ([key, { name, type, getValue }]) => ({ key, name, type, getValue })
  );

  const inputVars: Record<string, { type: string; value: any }> =
    apmServerConfigs.reduce((acc, { key, name, type, getValue }) => {
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
  'apm-server.rum.enabled': {
    name: 'enable_rum',
    type: 'bool',
  },
  'apm-server.default_service_environment': {
    name: 'default_service_environment',
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
  'apm-server.rum.event_rate.limit': {
    name: 'rum_event_rate_limit',
    type: 'integer',
  },
  'apm-server.rum.allow_service_names': {
    name: 'rum_allow_service_names',
    type: 'text',
  },
  'apm-server.rum.event_rate.lru_size': {
    name: 'rum_event_rate_lru_size',
    type: 'integer',
  },
  'apm-server.rum.response_headers': {
    name: 'rum_response_headers',
    type: 'yaml',
  },
  'apm-server.rum.library_pattern': {
    name: 'rum_library_pattern',
    type: 'text',
  },
  'apm-server.rum.exclude_from_grouping': {
    name: 'rum_exclude_from_grouping',
    type: 'text',
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
  'apm-server.auth.secret_token': {
    name: 'secret_token',
    type: 'text',
  },
  'apm-server.auth.api_key.enabled': {
    name: 'api_key_enabled',
    type: 'bool',
  },
  'apm-server.auth.api_key.limit': {
    name: 'api_key_limit',
    type: 'bool',
  },
  'apm-server.auth.anonymous.enabled': {
    name: 'anonymous_enabled',
    type: 'bool',
  },
  'apm-server.auth.anonymous.allow_agent': {
    name: 'anonymous_allow_agent',
    type: 'text',
  },
  'apm-server.auth.anonymous.allow_service': {
    name: 'anonymous_allow_service',
    type: 'text',
  },
  'apm-server.auth.anonymous.rate_limit.ip_limit': {
    name: 'anonymous_rate_limit_ip_limit',
    type: 'integer',
  },
  'apm-server.auth.anonymous.rate_limit.event_limit': {
    name: 'anonymous_rate_limit_event_limit',
    type: 'integer',
  },
  'apm-server.sampling.tail.enabled': {
    name: 'tail_sampling_enabled',
    type: 'bool',
  },
  'apm-server.sampling.tail.interval': {
    name: 'tail_sampling_interval',
    type: 'text',
  },
  'apm-server.sampling.tail.policies': {
    name: 'tail_sampling_policies',
    type: 'yaml',
  },
};
