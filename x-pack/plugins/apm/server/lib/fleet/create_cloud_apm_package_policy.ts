import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  Logger,
} from 'kibana/server';
import { APMPluginStartDependencies } from '../../types';

export async function createCloudApmPackgePolicy({
  fleetPluginStart,
  savedObjectsClient,
  esClient,
  logger,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  const { attributes } = await savedObjectsClient.get(
    'apm-server-settings',
    'apm-server-settings'
  );
  const apmServerSchema: Record<
    string,
    ApmPackagePolicyInputVars[keyof ApmPackagePolicyInputVars]
  > = JSON.parse((attributes as { schemaJson: string }).schemaJson);
  const apmServerConfigs = Object.entries(
    apmServerSchema
  ).map(([key, value]) => ({ key, value }));

  const inputVars: Partial<ApmPackagePolicyInputVars> = apmServerConfigs.reduce(
    (acc, config) => {
      if (config.key in apmConfigMapping) {
        return {
          ...acc,
          [apmConfigMapping[config.key]]: config.value,
        };
      }
      return acc;
    },
    {}
  );
  const apmPackagePolicyDefinition = getNewApmPackagePolicy(inputVars);

  logger.info(`Fleet migration on Cloud - apmPackagePolicy create start`);
  const apmPackagePolicy = await fleetPluginStart.packagePolicyService.create(
    savedObjectsClient,
    esClient,
    apmPackagePolicyDefinition,
    { force: true, bumpRevision: true }
  );
  logger.info(`Fleet migration on Cloud - apmPackagePolicy create end`);
  return apmPackagePolicy;
}

function getNewApmPackagePolicy(
  // TODO default value not necessary for release
  settings: Partial<ApmPackagePolicyInputVars> = {
    host: 'localhost:8200',
    url: 'http://localhost:8200',
    api_key_enabled: false,
    enable_rum: true,
    rum_allow_origins: ['*'],
    rum_event_rate_limit: 10,
    rum_event_rate_lru_size: 10000,
    api_key_limit: 100,
    max_event_bytes: 307200,
    capture_personal_data: true,
    max_header_bytes: 1048576,
    idle_timeout: '45s',
    read_timeout: '3600s',
    shutdown_timeout: '30s',
    write_timeout: '30s',
    max_connections: 0,
    expvar_enabled: false,
    tls_enabled: false,
  }
) {
  const newApmPackagePolicy = {
    name: 'apm',
    namespace: 'default',
    enabled: true,
    policy_id: 'policy-elastic-agent-on-cloud',
    output_id: '',
    inputs: [
      {
        type: 'apm',
        enabled: true,
        streams: [],
        vars: {
          host: {
            type: 'text',
            value: settings.host,
          },
          url: {
            type: 'text',
            value: settings.url,
          },
          secret_token: {
            type: 'text',
            value: settings.secret_token,
          },
          api_key_enabled: {
            type: 'bool',
            value: settings.api_key_enabled,
          },
          enable_rum: {
            type: 'bool',
            value: settings.enable_rum,
          },
          default_service_environment: {
            type: 'text',
            value: settings.default_service_environment,
          },
          rum_allow_service_names: {
            type: 'text',
            value: settings.rum_allow_service_names,
          },
          rum_allow_origins: {
            type: 'text',
            value: settings.rum_allow_origins,
          },
          rum_allow_headers: {
            type: 'text',
            value: settings.rum_allow_headers,
          },
          rum_response_headers: {
            type: 'yaml',
            value: settings.rum_response_headers,
          },
          rum_event_rate_limit: {
            type: 'integer',
            value: settings.rum_event_rate_limit,
          },
          rum_event_rate_lru_size: {
            type: 'integer',
            value: settings.rum_event_rate_lru_size,
          },
          sourcemap_api_key: {
            type: 'text',
            value: settings.sourcemap_api_key,
          },
          api_key_limit: {
            type: 'integer',
            value: settings.api_key_limit,
          },
          max_event_bytes: {
            type: 'integer',
            value: settings.max_event_bytes,
          },
          capture_personal_data: {
            type: 'bool',
            value: settings.capture_personal_data,
          },
          max_header_bytes: {
            type: 'integer',
            value: settings.max_header_bytes,
          },
          idle_timeout: {
            type: 'text',
            value: settings.idle_timeout,
          },
          read_timeout: {
            type: 'text',
            value: settings.read_timeout,
          },
          shutdown_timeout: {
            type: 'text',
            value: settings.shutdown_timeout,
          },
          write_timeout: {
            type: 'text',
            value: settings.write_timeout,
          },
          max_connections: {
            type: 'integer',
            value: settings.max_connections,
          },
          response_headers: {
            type: 'yaml',
            value: settings.response_headers,
          },
          expvar_enabled: {
            type: 'bool',
            value: settings.expvar_enabled,
          },
          tls_enabled: {
            type: 'bool',
            value: settings.tls_enabled,
          },
          tls_certificate: {
            type: 'text',
            value: settings.tls_certificate,
          },
          tls_key: {
            type: 'text',
            value: settings.tls_key,
          },
          tls_supported_protocols: {
            type: 'text',
            value: settings.tls_supported_protocols,
          },
          tls_cipher_suites: {
            type: 'text',
            value: settings.tls_cipher_suites,
          },
          tls_curve_types: {
            type: 'text',
            value: settings.tls_curve_types,
          },
        },
      },
    ],
    // TODO see if we can make version configurable
    package: { name: 'apm', version: '0.2.0', title: 'Elastic APM' },
  };

  return newApmPackagePolicy;
}

export const apmConfigMapping: Record<
  string,
  keyof ApmPackagePolicyInputVars
> = {
  'apm-server.host': 'host',
  'apm-server.secret_token': 'secret_token',
  'apm-server.rum.enabled': 'enable_rum',
  'apm-server.default_service_environment': 'default_service_environment',
  'apm-server.rum.allow_service_names': 'rum_allow_service_names',
  'apm-server.rum.allow_origins': 'rum_allow_origins',
  'apm-server.rum.allow_headers': 'rum_allow_headers',
  'apm-server.rum.event_rate.limit': 'rum_event_rate_limit',
  'apm-server.rum.event_rate.lru_size': 'rum_event_rate_lru_size',
  'apm-server.max_event_size': 'max_event_bytes',
  'apm-server.capture_personal_data': 'capture_personal_data',
  'apm-server.max_header_size': 'max_header_bytes',
  'apm-server.idle_timeout': 'idle_timeout',
  'apm-server.read_timeout': 'read_timeout',
  'apm-server.shutdown_timeout': 'shutdown_timeout',
  'apm-server.write_timeout': 'write_timeout',
  'apm-server.max_connections': 'max_connections',
  'apm-server.expvar.enabled': 'expvar_enabled',
  'apm-server.ssl.enabled': 'tls_enabled',
  'apm-server.ssl.certificate': 'tls_certificate',
  'apm-server.ssl.key': 'tls_key',
  'apm-server.ssl.supported_protocols': 'tls_supported_protocols',
  'apm-server.ssl.cipher_suites': 'tls_cipher_suites',
  'apm-server.ssl.curve_types': 'tls_curve_types',
};

interface ApmPackagePolicyInputVars {
  host: string;
  url: string; // No config mapping
  secret_token: string;
  api_key_enabled: boolean; // No config mapping
  enable_rum: boolean;
  default_service_environment: string;
  rum_allow_service_names: string[];
  rum_allow_origins: string[];
  rum_allow_headers: string[];
  rum_response_headers: object; // No config mapping
  rum_event_rate_limit: number;
  rum_event_rate_lru_size: number;
  sourcemap_api_key: string; // No config mapping
  api_key_limit: number; // No config mapping
  max_event_bytes: number;
  capture_personal_data: boolean;
  max_header_bytes: number;
  idle_timeout: string;
  read_timeout: string;
  shutdown_timeout: string;
  write_timeout: string;
  max_connections: number;
  response_headers: object; // No config mapping
  expvar_enabled: boolean;
  tls_enabled: boolean;
  tls_certificate: string;
  tls_key: string;
  tls_supported_protocols: string[];
  tls_cipher_suites: string[];
  tls_curve_types: string[];
}
