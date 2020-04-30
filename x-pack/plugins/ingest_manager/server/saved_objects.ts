/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsServiceSetup, SavedObjectsType } from 'kibana/server';
import { EncryptedSavedObjectsPluginSetup } from '../../encrypted_saved_objects/server';
import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  AGENT_ACTION_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
  GLOBAL_SETTINGS_SAVED_OBJET_TYPE,
} from './constants';

/*
 * Saved object types and mappings
 *
 * Please update typings in `/common/types` if mappings are updated.
 */

const savedObjectTypes: { [key: string]: SavedObjectsType } = {
  [GLOBAL_SETTINGS_SAVED_OBJET_TYPE]: {
    name: GLOBAL_SETTINGS_SAVED_OBJET_TYPE,
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
        access_api_key_id: { type: 'keyword' },
        version: { type: 'keyword' },
        user_provided_metadata: { type: 'text' },
        local_metadata: { type: 'text' },
        config_id: { type: 'keyword' },
        last_updated: { type: 'date' },
        last_checkin: { type: 'date' },
        config_revision: { type: 'integer' },
        config_newest_revision: { type: 'integer' },
        default_api_key_id: { type: 'keyword' },
        default_api_key: { type: 'keyword' },
        updated_at: { type: 'date' },
        current_error_events: { type: 'text' },
      },
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
        config_id: { type: 'keyword' },
        stream_id: { type: 'keyword' },
        timestamp: { type: 'date' },
        message: { type: 'text' },
        payload: { type: 'text' },
        data: { type: 'text' },
      },
    },
  },
  [AGENT_CONFIG_SAVED_OBJECT_TYPE]: {
    name: AGENT_CONFIG_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      properties: {
        id: { type: 'keyword' },
        name: { type: 'text' },
        is_default: { type: 'boolean' },
        namespace: { type: 'keyword' },
        description: { type: 'text' },
        status: { type: 'keyword' },
        datasources: { type: 'keyword' },
        updated_on: { type: 'keyword' },
        updated_by: { type: 'keyword' },
        revision: { type: 'integer' },
        monitoring_enabled: { type: 'keyword' },
      },
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
        config_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        expire_at: { type: 'date' },
        active: { type: 'boolean' },
      },
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
        ca_sha256: { type: 'keyword' },
        fleet_enroll_username: { type: 'binary' },
        fleet_enroll_password: { type: 'binary' },
        config: { type: 'flattened' },
      },
    },
  },
  [DATASOURCE_SAVED_OBJECT_TYPE]: {
    name: DATASOURCE_SAVED_OBJECT_TYPE,
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
        config_id: { type: 'keyword' },
        enabled: { type: 'boolean' },
        package: {
          properties: {
            name: { type: 'keyword' },
            title: { type: 'keyword' },
            version: { type: 'keyword' },
          },
        },
        output_id: { type: 'keyword' },
        inputs: {
          type: 'nested',
          properties: {
            type: { type: 'keyword' },
            enabled: { type: 'boolean' },
            processors: { type: 'keyword' },
            config: { type: 'flattened' },
            vars: { type: 'flattened' },
            streams: {
              type: 'nested',
              properties: {
                id: { type: 'keyword' },
                enabled: { type: 'boolean' },
                dataset: { type: 'keyword' },
                processors: { type: 'keyword' },
                config: { type: 'flattened' },
                agent_stream: { type: 'flattened' },
                vars: { type: 'flattened' },
              },
            },
          },
        },
        revision: { type: 'integer' },
      },
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
          dynamic: 'false',
          type: 'object',
        },
        installed: {
          type: 'nested',
          properties: {
            id: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
      },
    },
  },
};

export function registerSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  Object.values(savedObjectTypes).forEach(type => {
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
      'config_id',
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
      'config_id',
      'last_updated',
      'last_checkin',
      'config_revision',
      'config_newest_revision',
      'updated_at',
      'current_error_events',
    ]),
  });
  encryptedSavedObjects.registerType({
    type: AGENT_ACTION_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['data']),
    attributesToExcludeFromAAD: new Set(['agent_id', 'type', 'sent_at', 'created_at']),
  });
}
