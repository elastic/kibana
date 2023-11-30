/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup, SavedObjectsType } from '@kbn/core/server';

import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  ASSETS_SAVED_OBJECT_TYPE,
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  FLEET_PROXY_SAVED_OBJECT_TYPE,
  MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
  INGEST_SAVED_OBJECT_INDEX,
  UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
} from '../constants';

import { migrateSyntheticsPackagePolicyToV8120 } from './migrations/synthetics/to_v8_12_0';

import {
  migratePackagePolicyEvictionsFromV8110,
  migratePackagePolicyToV8110,
} from './migrations/security_solution/to_v8_11_0';

import { migrateCspPackagePolicyToV8110 } from './migrations/cloud_security_posture';

import { migrateOutputEvictionsFromV8100, migrateOutputToV8100 } from './migrations/to_v8_10_0';

import { migrateSyntheticsPackagePolicyToV8100 } from './migrations/synthetics/to_v8_10_0';

import { migratePackagePolicyEvictionsFromV8100 } from './migrations/security_solution/to_v8_10_0';

import {
  migrateAgentPolicyToV7100,
  migratePackagePolicyToV7100,
  migrateSettingsToV7100,
} from './migrations/to_v7_10_0';

import { migratePackagePolicyToV7110 } from './migrations/to_v7_11_0';

import { migrateAgentPolicyToV7120, migratePackagePolicyToV7120 } from './migrations/to_v7_12_0';
import {
  migratePackagePolicyToV7130,
  migrateSettingsToV7130,
  migrateOutputToV7130,
} from './migrations/to_v7_13_0';
import { migratePackagePolicyToV7140, migrateInstallationToV7140 } from './migrations/to_v7_14_0';
import { migratePackagePolicyToV7150 } from './migrations/to_v7_15_0';
import { migrateInstallationToV7160, migratePackagePolicyToV7160 } from './migrations/to_v7_16_0';
import { migrateInstallationToV800, migrateOutputToV800 } from './migrations/to_v8_0_0';
import { migratePackagePolicyToV820 } from './migrations/to_v8_2_0';
import { migrateInstallationToV830, migratePackagePolicyToV830 } from './migrations/to_v8_3_0';
import {
  migrateInstallationToV840,
  migrateAgentPolicyToV840,
  migratePackagePolicyToV840,
} from './migrations/to_v8_4_0';
import { migratePackagePolicyToV850, migrateAgentPolicyToV850 } from './migrations/to_v8_5_0';
import {
  migrateSettingsToV860,
  migrateInstallationToV860,
  migratePackagePolicyToV860,
} from './migrations/to_v8_6_0';
import {
  migratePackagePolicyToV8100,
  migratePackagePolicyToV870,
} from './migrations/security_solution';
import { migratePackagePolicyToV880 } from './migrations/to_v8_8_0';
import { migrateAgentPolicyToV890 } from './migrations/to_v8_9_0';
import {
  migratePackagePolicyToV81102,
  migratePackagePolicyEvictionsFromV81102,
} from './migrations/security_solution/to_v8_11_0_2';

/*
 * Saved object types and mappings
 *
 * Please update typings in `/common/types` as well as
 * schemas in `/server/types` if mappings are updated.
 */
const getSavedObjectTypes = (): { [key: string]: SavedObjectsType } => ({
  // Deprecated
  [GLOBAL_SETTINGS_SAVED_OBJECT_TYPE]: {
    name: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        fleet_server_hosts: { type: 'keyword' },
        has_seen_add_data_notice: { type: 'boolean', index: false },
        prerelease_integrations_enabled: { type: 'boolean' },
        secret_storage_requirements_met: { type: 'boolean' },
      },
    },
    migrations: {
      '7.10.0': migrateSettingsToV7100,
      '7.13.0': migrateSettingsToV7130,
      '8.6.0': migrateSettingsToV860,
    },
  },
  [AGENT_POLICY_SAVED_OBJECT_TYPE]: {
    name: AGENT_POLICY_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        name: { type: 'keyword' },
        schema_version: { type: 'version' },
        description: { type: 'text' },
        namespace: { type: 'keyword' },
        is_managed: { type: 'boolean' },
        is_default: { type: 'boolean' },
        is_default_fleet_server: { type: 'boolean' },
        status: { type: 'keyword' },
        unenroll_timeout: { type: 'integer' },
        inactivity_timeout: { type: 'integer' },
        updated_at: { type: 'date' },
        updated_by: { type: 'keyword' },
        revision: { type: 'integer' },
        monitoring_enabled: { type: 'keyword', index: false },
        is_preconfigured: { type: 'keyword' },
        data_output_id: { type: 'keyword' },
        monitoring_output_id: { type: 'keyword' },
        download_source_id: { type: 'keyword' },
        fleet_server_host_id: { type: 'keyword' },
        agent_features: {
          properties: {
            name: { type: 'keyword' },
            enabled: { type: 'boolean' },
          },
        },
        is_protected: { type: 'boolean' },
        overrides: { type: 'flattened', index: false },
        keep_monitoring_alive: { type: 'boolean' },
      },
    },
    migrations: {
      '7.10.0': migrateAgentPolicyToV7100,
      '7.12.0': migrateAgentPolicyToV7120,
      '8.4.0': migrateAgentPolicyToV840,
      '8.5.0': migrateAgentPolicyToV850,
      '8.9.0': migrateAgentPolicyToV890,
    },
  },
  [OUTPUT_SAVED_OBJECT_TYPE]: {
    name: OUTPUT_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        output_id: { type: 'keyword', index: false },
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        is_default: { type: 'boolean' },
        is_default_monitoring: { type: 'boolean' },
        hosts: { type: 'keyword' },
        ca_sha256: { type: 'keyword', index: false },
        ca_trusted_fingerprint: { type: 'keyword', index: false },
        service_token: { type: 'keyword', index: false },
        config: { type: 'flattened' },
        config_yaml: { type: 'text' },
        is_preconfigured: { type: 'boolean', index: false },
        ssl: { type: 'binary' },
        proxy_id: { type: 'keyword' },
        shipper: {
          dynamic: false, // we aren't querying or aggregating over this data, so we don't need to specify any fields
          properties: {},
        },
        allow_edit: { enabled: false },
        version: { type: 'keyword' },
        key: { type: 'keyword' },
        compression: { type: 'keyword' },
        compression_level: { type: 'integer' },
        client_id: { type: 'keyword' },
        auth_type: { type: 'keyword' },
        connection_type: { type: 'keyword' },
        username: { type: 'keyword' },
        password: { type: 'text', index: false },
        sasl: {
          dynamic: false,
          properties: {
            mechanism: { type: 'text' },
          },
        },
        partition: { type: 'keyword' },
        random: {
          dynamic: false,
          properties: {
            group_events: { type: 'integer' },
          },
        },
        round_robin: {
          dynamic: false,
          properties: {
            group_events: { type: 'integer' },
          },
        },
        hash: {
          dynamic: false,
          properties: {
            hash: { type: 'text' },
            random: { type: 'boolean' },
          },
        },
        topics: {
          dynamic: false,
          properties: {
            topic: { type: 'keyword' },
            when: {
              dynamic: false,
              properties: {
                type: { type: 'text' },
                condition: { type: 'text' },
              },
            },
          },
        },
        headers: {
          dynamic: false,
          properties: {
            key: { type: 'text' },
            value: { type: 'text' },
          },
        },
        timeout: { type: 'integer' },
        broker_timeout: { type: 'integer' },
        broker_ack_reliability: { type: 'text' },
        broker_buffer_size: { type: 'integer' },
        required_acks: { type: 'integer' },
        channel_buffer_size: { type: 'integer' },
        secrets: {
          dynamic: false,
          properties: {
            password: {
              dynamic: false,
              properties: {
                id: { type: 'keyword' },
              },
            },
            ssl: {
              dynamic: false,
              properties: {
                key: {
                  dynamic: false,
                  properties: {
                    id: { type: 'keyword' },
                  },
                },
              },
            },
            service_token: {
              dynamic: false,
              properties: {
                id: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
    modelVersions: {
      '1': {
        changes: [
          {
            type: 'mappings_deprecation',
            deprecatedMappings: [
              'broker_ack_reliability',
              'broker_buffer_size',
              'channel_buffer_size',
            ],
          },
          {
            type: 'data_backfill',
            backfillFn: migrateOutputToV8100,
          },
        ],
        schemas: {
          forwardCompatibility: migrateOutputEvictionsFromV8100,
        },
      },
      '2': {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              service_token: { type: 'keyword', index: false },
            },
          },
        ],
      },
      '3': {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              secrets: {
                properties: {
                  service_token: {
                    dynamic: false,
                    properties: {
                      id: { type: 'keyword' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
    migrations: {
      '7.13.0': migrateOutputToV7130,
      '8.0.0': migrateOutputToV800,
    },
  },
  [PACKAGE_POLICY_SAVED_OBJECT_TYPE]: {
    name: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        name: { type: 'keyword' },
        description: { type: 'text' },
        namespace: { type: 'keyword' },
        enabled: { type: 'boolean' },
        is_managed: { type: 'boolean' },
        policy_id: { type: 'keyword' },
        package: {
          properties: {
            name: { type: 'keyword' },
            title: { type: 'keyword' },
            version: { type: 'keyword' },
          },
        },
        elasticsearch: {
          dynamic: false,
          properties: {},
        },
        vars: { type: 'flattened' },
        inputs: {
          dynamic: false,
          properties: {},
        },
        secret_references: { properties: { id: { type: 'keyword' } } },
        revision: { type: 'integer' },
        updated_at: { type: 'date' },
        updated_by: { type: 'keyword' },
        created_at: { type: 'date' },
        created_by: { type: 'keyword' },
      },
    },
    modelVersions: {
      '1': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: migratePackagePolicyToV8100,
          },
          {
            type: 'data_backfill',
            backfillFn: migrateSyntheticsPackagePolicyToV8100,
          },
        ],
        schemas: {
          forwardCompatibility: migratePackagePolicyEvictionsFromV8100,
        },
      },
      '2': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: migratePackagePolicyToV8110,
          },
        ],
        schemas: {
          forwardCompatibility: migratePackagePolicyEvictionsFromV8110,
        },
      },
      '3': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: migratePackagePolicyToV81102,
          },
        ],
        schemas: {
          forwardCompatibility: migratePackagePolicyEvictionsFromV81102,
        },
      },
      '4': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: migrateCspPackagePolicyToV8110,
          },
        ],
      },
      '5': {
        changes: [
          {
            type: 'data_backfill',
            backfillFn: migrateSyntheticsPackagePolicyToV8120,
          },
        ],
      },
    },
    migrations: {
      '7.10.0': migratePackagePolicyToV7100,
      '7.11.0': migratePackagePolicyToV7110,
      '7.12.0': migratePackagePolicyToV7120,
      '7.13.0': migratePackagePolicyToV7130,
      '7.14.0': migratePackagePolicyToV7140,
      '7.15.0': migratePackagePolicyToV7150,
      '7.16.0': migratePackagePolicyToV7160,
      '8.2.0': migratePackagePolicyToV820,
      '8.3.0': migratePackagePolicyToV830,
      '8.4.0': migratePackagePolicyToV840,
      '8.5.0': migratePackagePolicyToV850,
      '8.6.0': migratePackagePolicyToV860,
      '8.7.0': migratePackagePolicyToV870,
      '8.8.0': migratePackagePolicyToV880,
    },
  },
  [PACKAGES_SAVED_OBJECT_TYPE]: {
    name: PACKAGES_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        name: { type: 'keyword' },
        version: { type: 'keyword' },
        internal: { type: 'boolean' },
        keep_policies_up_to_date: { type: 'boolean', index: false },
        es_index_patterns: {
          dynamic: false,
          properties: {},
        },
        verification_status: { type: 'keyword' },
        verification_key_id: { type: 'keyword' },
        installed_es: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            type: { type: 'keyword' },
            version: { type: 'keyword' },
            deferred: { type: 'boolean' },
          },
        },
        latest_install_failed_attempts: { type: 'object', enabled: false },
        installed_kibana: {
          dynamic: false,
          properties: {},
        },
        installed_kibana_space_id: { type: 'keyword' },
        package_assets: {
          dynamic: false,
          properties: {},
        },
        install_started_at: { type: 'date' },
        install_version: { type: 'keyword' },
        install_status: { type: 'keyword' },
        install_source: { type: 'keyword' },
        install_format_schema_version: { type: 'version' },
        experimental_data_stream_features: {
          type: 'nested',
          properties: {
            data_stream: { type: 'keyword' },
            features: {
              type: 'nested',
              dynamic: false,
              properties: {
                synthetic_source: { type: 'boolean' },
                tsdb: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    modelVersions: {
      '1': {
        changes: [
          {
            type: 'mappings_addition',
            addedMappings: {
              latest_install_failed_attempts: { type: 'object', enabled: false },
            },
          },
        ],
      },
    },
    migrations: {
      '7.14.0': migrateInstallationToV7140,
      '7.14.1': migrateInstallationToV7140,
      '7.16.0': migrateInstallationToV7160,
      '8.0.0': migrateInstallationToV800,
      '8.3.0': migrateInstallationToV830,
      '8.4.0': migrateInstallationToV840,
      '8.6.0': migrateInstallationToV860,
    },
  },
  [ASSETS_SAVED_OBJECT_TYPE]: {
    name: ASSETS_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        package_name: { type: 'keyword' },
        package_version: { type: 'keyword' },
        install_source: { type: 'keyword' },
        asset_path: { type: 'keyword' },
        media_type: { type: 'keyword' },
        data_utf8: { type: 'text', index: false },
        data_base64: { type: 'binary' },
      },
    },
  },
  [PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE]: {
    name: PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
      },
    },
  },
  [DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE]: {
    name: DOWNLOAD_SOURCE_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        source_id: { type: 'keyword', index: false },
        name: { type: 'keyword' },
        is_default: { type: 'boolean' },
        host: { type: 'keyword' },
        proxy_id: { type: 'keyword' },
      },
    },
  },
  [FLEET_SERVER_HOST_SAVED_OBJECT_TYPE]: {
    name: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        name: { type: 'keyword' },
        is_default: { type: 'boolean' },
        host_urls: { type: 'keyword', index: false },
        is_preconfigured: { type: 'boolean' },
        proxy_id: { type: 'keyword' },
      },
    },
  },
  [FLEET_PROXY_SAVED_OBJECT_TYPE]: {
    name: FLEET_PROXY_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        name: { type: 'keyword' },
        url: { type: 'keyword', index: false },
        proxy_headers: { type: 'text', index: false },
        certificate_authorities: { type: 'keyword', index: false },
        certificate: { type: 'keyword', index: false },
        certificate_key: { type: 'keyword', index: false },
        is_preconfigured: { type: 'boolean' },
      },
    },
  },
  [MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE]: {
    name: MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      dynamic: false,
      properties: {},
    },
  },
  [UNINSTALL_TOKENS_SAVED_OBJECT_TYPE]: {
    name: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
    indexPattern: INGEST_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      dynamic: false,
      properties: {
        policy_id: { type: 'keyword' },
        token_plain: { type: 'keyword' },
      },
    },
  },
});

export function registerSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  const savedObjectTypes = getSavedObjectTypes();
  Object.values(savedObjectTypes).forEach((type) => {
    savedObjects.registerType(type);
  });
}

export function registerEncryptedSavedObjects(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  encryptedSavedObjects.registerType({
    type: OUTPUT_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set([
      { key: 'ssl', dangerouslyExposeValue: true },
      { key: 'password', dangerouslyExposeValue: true },
    ]),
    attributesToExcludeFromAAD: new Set([
      'output_id',
      'name',
      'type',
      'is_default',
      'is_default_monitoring',
      'hosts',
      'ca_sha256',
      'ca_trusted_fingerprint',
      'config',
      'config_yaml',
      'is_preconfigured',
      'proxy_id',
      'version',
      'key',
      'compression',
      'compression_level',
      'client_id',
      'auth_type',
      'connection_type',
      'username',
      'sasl',
      'partition',
      'random',
      'round_robin',
      'hash',
      'topics',
      'headers',
      'timeout',
      'broker_timeout',
      'required_acks',
    ]),
  });
  // Encrypted saved objects
  encryptedSavedObjects.registerType({
    type: MESSAGE_SIGNING_KEYS_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['passphrase']),
  });
  encryptedSavedObjects.registerType({
    type: UNINSTALL_TOKENS_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['token']),
  });
}
