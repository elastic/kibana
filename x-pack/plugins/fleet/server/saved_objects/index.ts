/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup, SavedObjectsType } from 'kibana/server';

import type { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  ASSETS_SAVED_OBJECT_TYPE,
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
} from '../constants';

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

/*
 * Saved object types and mappings
 *
 * Please update typings in `/common/types` as well as
 * schemas in `/server/types` if mappings are updated.
 */
const getSavedObjectTypes = (
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
): { [key: string]: SavedObjectsType } => ({
  [GLOBAL_SETTINGS_SAVED_OBJECT_TYPE]: {
    name: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        fleet_server_hosts: { type: 'keyword' },
        has_seen_add_data_notice: { type: 'boolean', index: false },
        has_seen_fleet_migration_notice: { type: 'boolean', index: false },
      },
    },
    migrations: {
      '7.10.0': migrateSettingsToV7100,
      '7.13.0': migrateSettingsToV7130,
    },
  },
  [AGENT_POLICY_SAVED_OBJECT_TYPE]: {
    name: AGENT_POLICY_SAVED_OBJECT_TYPE,
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
        is_managed: { type: 'boolean' },
        is_default: { type: 'boolean' },
        is_default_fleet_server: { type: 'boolean' },
        status: { type: 'keyword' },
        package_policies: { type: 'keyword' },
        unenroll_timeout: { type: 'integer' },
        updated_at: { type: 'date' },
        updated_by: { type: 'keyword' },
        revision: { type: 'integer' },
        monitoring_enabled: { type: 'keyword', index: false },
        is_preconfigured: { type: 'keyword' },
        data_output_id: { type: 'keyword' },
        monitoring_output_id: { type: 'keyword' },
      },
    },
    migrations: {
      '7.10.0': migrateAgentPolicyToV7100,
      '7.12.0': migrateAgentPolicyToV7120,
    },
  },
  [OUTPUT_SAVED_OBJECT_TYPE]: {
    name: OUTPUT_SAVED_OBJECT_TYPE,
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
        config: { type: 'flattened' },
        config_yaml: { type: 'text' },
        is_preconfigured: { type: 'boolean', index: false },
        ssl: { type: 'binary' },
      },
    },
    migrations: {
      '7.13.0': migrateOutputToV7130,
      '8.0.0': migrateOutputToV800,
    },
  },
  [PACKAGE_POLICY_SAVED_OBJECT_TYPE]: {
    name: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
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
        policy_id: { type: 'keyword' },
        output_id: { type: 'keyword' },
        package: {
          properties: {
            name: { type: 'keyword' },
            title: { type: 'keyword' },
            version: { type: 'keyword' },
          },
        },
        elasticsearch: {
          enabled: false,
          properties: {
            privileges: {
              properties: {
                cluster: { type: 'keyword' },
              },
            },
          },
        },
        vars: { type: 'flattened' },
        inputs: {
          type: 'nested',
          enabled: false,
          properties: {
            type: { type: 'keyword' },
            policy_template: { type: 'keyword' },
            enabled: { type: 'boolean' },
            vars: { type: 'flattened' },
            config: { type: 'flattened' },
            compiled_input: { type: 'flattened' },
            streams: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                enabled: { type: 'boolean' },
                data_stream: {
                  properties: {
                    dataset: { type: 'keyword' },
                    type: { type: 'keyword' },
                    elasticsearch: {
                      properties: {
                        privileges: { type: 'flattened' },
                      },
                    },
                  },
                },
                vars: { type: 'flattened' },
                config: { type: 'flattened' },
                compiled_stream: { type: 'flattened' },
              },
            },
          },
        },
        revision: { type: 'integer' },
        updated_at: { type: 'date' },
        updated_by: { type: 'keyword' },
        created_at: { type: 'date' },
        created_by: { type: 'keyword' },
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
    },
  },
  [PACKAGES_SAVED_OBJECT_TYPE]: {
    name: PACKAGES_SAVED_OBJECT_TYPE,
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
        removable: { type: 'boolean' },
        keep_policies_up_to_date: { type: 'boolean', index: false },
        es_index_patterns: {
          enabled: false,
          type: 'object',
        },
        installed_es: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
        installed_kibana: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
        installed_kibana_space_id: { type: 'keyword' },
        package_assets: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
        install_started_at: { type: 'date' },
        install_version: { type: 'keyword' },
        install_status: { type: 'keyword' },
        install_source: { type: 'keyword' },
      },
    },
    migrations: {
      '7.14.0': migrateInstallationToV7140,
      '7.14.1': migrateInstallationToV7140,
      '7.16.0': migrateInstallationToV7160,
      '8.0.0': migrateInstallationToV800,
    },
  },
  [ASSETS_SAVED_OBJECT_TYPE]: {
    name: ASSETS_SAVED_OBJECT_TYPE,
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
});

export function registerSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  const savedObjectTypes = getSavedObjectTypes(encryptedSavedObjects);
  Object.values(savedObjectTypes).forEach((type) => {
    savedObjects.registerType(type);
  });
}

export function registerEncryptedSavedObjects(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  encryptedSavedObjects.registerType({
    type: OUTPUT_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set([{ key: 'ssl', dangerouslyExposeValue: true }]),
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
    ]),
  });
  // Encrypted saved objects
}
