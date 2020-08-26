/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceSetup, SavedObjectsType } from 'kibana/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../encrypted_saved_objects/server';
import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  AGENT_ACTION_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
} from '../constants';
import {
  migrateAgentToV7100,
  migrateAgentEventToV7100,
  migrateAgentPolicyToV7100,
  migrateEnrollmentApiKeysToV7100,
  migratePackagePolicyToV7100,
} from './migrations/to_v7_10_0';

/*
 * Saved object types and mappings
 *
 * Please update typings in `/common/types` as well as
 * schemas in `/server/types` if mappings are updated.
 */
const savedObjectTypes: { [key: string]: SavedObjectsType } = {
  [GLOBAL_SETTINGS_SAVED_OBJECT_TYPE]: {
    name: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        agent_auto_upgrade: { type: 'keyword' },
        package_auto_upgrade: { type: 'keyword' },
        kibana_url: { type: 'keyword' },
        kibana_ca_sha256: { type: 'keyword' },
        has_seen_add_data_notice: { type: 'boolean', index: false },
      },
    },
  },
  [AGENT_SAVED_OBJECT_TYPE]: {
    name: AGENT_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        shared_id: { type: 'keyword' },
        type: { type: 'keyword' },
        active: { type: 'boolean' },
        enrolled_at: { type: 'date' },
        unenrolled_at: { type: 'date' },
        unenrollment_started_at: { type: 'date' },
        access_api_key_id: { type: 'keyword' },
        version: { type: 'keyword' },
        user_provided_metadata: { type: 'flattened' },
        local_metadata: { type: 'flattened' },
        policy_id: { type: 'keyword' },
        policy_revision: { type: 'integer' },
        last_updated: { type: 'date' },
        last_checkin: { type: 'date' },
        last_checkin_status: { type: 'keyword' },
        default_api_key_id: { type: 'keyword' },
        default_api_key: { type: 'binary' },
        updated_at: { type: 'date' },
        current_error_events: { type: 'text', index: false },
        packages: { type: 'keyword' },
      },
    },
    migrations: {
      '7.10.0': migrateAgentToV7100,
    },
  },
  [AGENT_ACTION_SAVED_OBJECT_TYPE]: {
    name: AGENT_ACTION_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        agent_id: { type: 'keyword' },
        type: { type: 'keyword' },
        data: { type: 'binary' },
        sent_at: { type: 'date' },
        created_at: { type: 'date' },
      },
    },
  },
  [AGENT_EVENT_SAVED_OBJECT_TYPE]: {
    name: AGENT_EVENT_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        type: { type: 'keyword' },
        subtype: { type: 'keyword' },
        agent_id: { type: 'keyword' },
        action_id: { type: 'keyword' },
        policy_id: { type: 'keyword' },
        stream_id: { type: 'keyword' },
        timestamp: { type: 'date' },
        message: { type: 'text' },
        payload: { type: 'text' },
        data: { type: 'text' },
      },
    },
    migrations: {
      '7.10.0': migrateAgentEventToV7100,
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
        is_default: { type: 'boolean' },
        status: { type: 'keyword' },
        package_policies: { type: 'keyword' },
        updated_at: { type: 'date' },
        updated_by: { type: 'keyword' },
        revision: { type: 'integer' },
        monitoring_enabled: { type: 'keyword', index: false },
      },
    },
    migrations: {
      '7.10.0': migrateAgentPolicyToV7100,
    },
  },
  [ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE]: {
    name: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        api_key: { type: 'binary' },
        api_key_id: { type: 'keyword' },
        policy_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        expire_at: { type: 'date' },
        active: { type: 'boolean' },
      },
    },
    migrations: {
      '7.10.0': migrateEnrollmentApiKeysToV7100,
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
        name: { type: 'keyword' },
        type: { type: 'keyword' },
        is_default: { type: 'boolean' },
        hosts: { type: 'keyword' },
        ca_sha256: { type: 'keyword', index: false },
        fleet_enroll_username: { type: 'binary' },
        fleet_enroll_password: { type: 'binary' },
        config: { type: 'flattened' },
      },
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
        inputs: {
          type: 'nested',
          enabled: false,
          properties: {
            type: { type: 'keyword' },
            enabled: { type: 'boolean' },
            vars: { type: 'flattened' },
            config: { type: 'flattened' },
            streams: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                enabled: { type: 'boolean' },
                data_stream: {
                  properties: {
                    dataset: { type: 'keyword' },
                    type: { type: 'keyword' },
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
        install_started_at: { type: 'date' },
        install_version: { type: 'keyword' },
        install_status: { type: 'keyword' },
      },
    },
  },
};

export function registerSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  Object.values(savedObjectTypes).forEach((type) => {
    savedObjects.registerType(type);
  });
}

export function registerEncryptedSavedObjects(
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  // Encrypted saved objects
  encryptedSavedObjects.registerType({
    type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['api_key']),
    attributesToExcludeFromAAD: new Set([
      'name',
      'type',
      'api_key_id',
      'policy_id',
      'created_at',
      'updated_at',
      'expire_at',
      'active',
    ]),
  });
  encryptedSavedObjects.registerType({
    type: OUTPUT_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['fleet_enroll_username', 'fleet_enroll_password']),
    attributesToExcludeFromAAD: new Set([
      'name',
      'type',
      'is_default',
      'hosts',
      'ca_sha256',
      'config',
    ]),
  });
  encryptedSavedObjects.registerType({
    type: AGENT_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['default_api_key']),
    attributesToExcludeFromAAD: new Set([
      'shared_id',
      'type',
      'active',
      'enrolled_at',
      'access_api_key_id',
      'version',
      'user_provided_metadata',
      'local_metadata',
      'policy_id',
      'policy_revision',
      'last_updated',
      'last_checkin',
      'last_checkin_status',
      'updated_at',
      'current_error_events',
      'unenrolled_at',
      'unenrollment_started_at',
      'packages',
    ]),
  });
  encryptedSavedObjects.registerType({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['data']),
    attributesToExcludeFromAAD: new Set(['agent_id', 'type', 'sent_at', 'created_at']),
  });
}
